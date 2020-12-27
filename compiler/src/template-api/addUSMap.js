const Canvas = require("../Canvas").Canvas;
const View = require("../View").View;
const Jump = require("../Jump").Jump;
const Layer = require("../Layer").Layer;
const Transform = require("../Transform").Transform;
const getBodyStringOfFunction = require("./Utilities").getBodyStringOfFunction;

const stateQuery = `SELECT cs.name, cs.state_id, cs.total_dem_votes, cs.total_rep_votes,
  cs.total_votes, (cs.total_dem_votes / (cs.total_votes+0.01)) as rate, cs.geomstr
  FROM (SELECT s.name, s.state_id, s.total_votes, SUM(c.dem_votes) as total_dem_votes, SUM(c.rep_votes) as total_rep_votes, s.geomstr
  FROM state s LEFT JOIN county c on c.state_id = s.state_id
  GROUP BY s.name, s.state_id, s.total_votes, s.geomstr) as cs;`;

const countyQuery = `SELECT name, state_id, county_id, dem_votes, rep_votes, total_votes, (dem_votes / (total_votes+0.01)) as rate, geomstr FROM county;`;

/**
 * Add a USMap template object to a project
 * @param usmap a USMap object
 * @param args an dictionary that contains customization parameters, see doc
 */
function addUSMap(usmap, args) {
    if (args == null) args = {};
    var numCanvas = "county" in usmap ? 2 : 1;
    if ("pyramid" in args && args.pyramid.length != numCanvas)
        throw new Error(
            "Adding USMap: args.pyramid does not have matching number of canvases"
        );

    // add to project
    this.usmaps.push(usmap);

    // rendering params
    var rpKey = "usmap_" + (this.usmaps.length - 1);
    var rpDict = {};
    rpDict[rpKey] = usmap.params;
    this.addRenderingParams(rpDict);

    // ================== state map canvas ===================
    var canvases = [];
    var stateMapCanvas;
    if ("pyramid" in args) stateMapCanvas = args.pyramid[0];
    else
        stateMapCanvas = new Canvas(
            "usmap" + (this.usmaps.length - 1) + "_" + "state",
            usmap.stateMapWidth,
            usmap.stateMapHeight
        );
    if (
        stateMapCanvas.w != usmap.stateMapWidth ||
        stateMapCanvas.h != usmap.stateMapHeight
    )
        throw new Error("Adding USMap: state canvas sizes do not match");
    this.addCanvas(stateMapCanvas);

    // static legends layer
    var stateMapLegendLayer = new Layer(null, true);
    stateMapCanvas.addLayer(stateMapLegendLayer);
    stateMapLegendLayer.addRenderingFunc(
        usmap.getUSMapRenderer("stateMapLegendRendering")
    );
    stateMapLegendLayer.setUSMapId(this.usmaps.length - 1 + "_" + 0);

    // state boundary layer
    // var stateMapTransform = new Transform(
    //     `SELECT name, , geomstr 
    //      FROM ${usmap.stateTable}`,
    //     usmap.db,
    //     usmap.getUSMapTransformFunc("stateMapTransform"),
    //     ["bbox_x", "bbox_y", "name", "rate", "geomstr"],
    //     true
    // );

    var stateMapTransform = new Transform(
      stateQuery,
      usmap.db,
      usmap.getUSMapTransformFunc("stateMapTransform"),
      ["bbox_x", "bbox_y", "name", "state_id", "dem_votes", "rep_votes", "total_votes", "rate", "geomstr"],
      true
    );

    var stateBoundaryLayer = new Layer(stateMapTransform, false);
    stateMapCanvas.addLayer(stateBoundaryLayer);
    stateBoundaryLayer.addPlacement({
        centroid_x: "col:bbox_x",
        centroid_y: "col:bbox_y",
        width: `con:${usmap.stateMapWidth / usmap.zoomFactor}`,
        height: `con:${usmap.stateMapWidth / usmap.zoomFactor}`
    });
    stateBoundaryLayer.addRenderingFunc(
        usmap.getUSMapRenderer("stateMapRendering")
    );
    // how do tooltips change? do they use the db column value or the actual d3 object value?
    // should be the actual d3 object value
    stateBoundaryLayer.addTooltip(
        ["name", "rate", "dem_votes", "rep_votes", "total_votes"],
        ["State", usmap.tooltipAlias, "Dem. Voters", "Rep. Voters", "Total Voters"]
    );
    stateBoundaryLayer.setUSMapId(this.usmaps.length - 1 + "_" + 0);

    // add to canvases (return)
    canvases.push(stateMapCanvas);

    // ==========  Views ===============
    if (!("view" in args)) {
        var view = new View(
            "usmap" + (this.usmaps.length - 1),
            0,
            0,
            usmap.stateMapWidth,
            usmap.stateMapHeight
        );
        this.addView(view);
        this.setInitialStates(view, stateMapCanvas, 0, 0);
    } else if (!(args.view instanceof View)) {
        throw new Error("Constructing USMap: view must be a View object");
    }

    // ================== county map canvas ===================
    if ("countyTable" in usmap) {
        var countyMapCanvas;
        if ("pyramid" in args) countyMapCanvas = args.pyramid[1];
        else
            countyMapCanvas = new Canvas(
                "usmap" + (this.usmaps.length - 1) + "_" + "county",
                usmap.stateMapWidth * usmap.zoomFactor,
                usmap.stateMapHeight * usmap.zoomFactor
            );
        if (
            countyMapCanvas.w != usmap.stateMapWidth * usmap.zoomFactor ||
            countyMapCanvas.h != usmap.stateMapHeight * usmap.zoomFactor
        )
            throw new Error("Adding USMap: county canvas sizes do not match");
        this.addCanvas(countyMapCanvas);

        // static legends layer
        var countyMapLegendLayer = new Layer(null, true);
        countyMapCanvas.addLayer(countyMapLegendLayer);
        countyMapLegendLayer.addRenderingFunc(
            usmap.getUSMapRenderer("countyMapLegendRendering")
        );
        countyMapLegendLayer.setUSMapId(this.usmaps.length - 1 + "_" + 1);

        // thick state boundary layer
        var countyMapStateBoundaryTransform = new Transform(
            `SELECT geomstr FROM ${usmap.stateTable}`,
            usmap.db,
            usmap.getUSMapTransformFunc("countyMapStateBoundaryTransform"),
            ["bbox_x", "bbox_y", "bbox_w", "bbox_h", "geomstr"],
            true
        );
        var countyMapStateBoundaryLayer = new Layer(
            countyMapStateBoundaryTransform,
            false
        );
        countyMapCanvas.addLayer(countyMapStateBoundaryLayer);
        countyMapStateBoundaryLayer.addPlacement({
            centroid_x: "col:bbox_x",
            centroid_y: "col:bbox_y",
            width: "col:bbox_w",
            height: "col:bbox_h"
        });
        countyMapStateBoundaryLayer.addRenderingFunc(
            usmap.getUSMapRenderer("countyMapStateBoundaryRendering")
        );
        countyMapStateBoundaryLayer.setUSMapId(
            this.usmaps.length - 1 + "_" + 1
        );

        // county boundary layer
        // var countyMapTransform = new Transform(
        //     `SELECT name, ${usmap.countyRateCol}, geomstr
        // FROM ${usmap.countyTable};`,
        //     usmap.db,
        //     usmap.getUSMapTransformFunc("countyMapTransform"),
        //     ["bbox_x", "bbox_y", "bbox_w", "bbox_h", "name", "rate", "geomstr"],
        //     true
        // );

        // TODO: support reverse function object in this transform, more important for counties than states..
        // b/c have to be able to adjust # of people and then update rate at county and then state level
        var countyMapTransform = new Transform(
          countyQuery,
          usmap.db,
          usmap.getUSMapTransformFunc("countyMapTransform"),
          // ["bbox_x", "bbox_y", "bbox_w", "bbox_h", "name", "dem_votes", "total_votes", "rate", "geomstr"],
          {
            "bbox_x": null,
            "bbox_y": null,
            "bbox_w": null,
            "bbox_h": null,
            "name": null,
            "state_id": null,
            "county_id": null,
            "dem_votes": function (oldRow, width, height) {
              let newRow = oldRow;
              let repVotes = newRow["total_votes"] - newRow["dem_votes"];
              newRow["rep_votes"] = repVotes;
              return newRow;
            },
            "rep_votes": function (oldRow, width, height) {
              let newRow = oldRow;
              let demVotes = newRow["total_votes"] - newRow["rep_votes"];
              newRow["dem_votes"] = demVotes;
              return newRow;
            },
            "total_votes": null,
            "rate": null,
            "geomstr": null,
          },
          true
        );
        var countyBoundaryLayer = new Layer(countyMapTransform, false);
        console.log(`transform dependency func: ${countyBoundaryLayer.addTransformDependency}`);
        countyBoundaryLayer.addTransformDependency(stateBoundaryLayer);
        countyMapCanvas.addLayer(countyBoundaryLayer);
        countyBoundaryLayer.addPlacement({
            centroid_x: "col:bbox_x",
            centroid_y: "col:bbox_y",
            width: "col:bbox_w",
            height: "col:bbox_h"
        });
        countyBoundaryLayer.addRenderingFunc(
            usmap.getUSMapRenderer("countyMapRendering")
        );
        countyBoundaryLayer.addTooltip(
          ["name", "rate", "dem_votes", "rep_votes", "total_votes"],
          ["County", usmap.tooltipAlias, "Dem. Voters", "Rep. Voters", "Total Voters"]
        );
        
        countyBoundaryLayer.setUSMapId(this.usmaps.length - 1 + "_" + 1);
        countyBoundaryLayer.setAllowUpdates();

        // add to canvases (return)
        canvases.push(countyMapCanvas);

        // =============== jump ===============
        if (usmap.zoomType == "literal") {
            this.addJump(
                new Jump(stateMapCanvas, countyMapCanvas, "literal_zoom_in")
            );
            this.addJump(
                new Jump(countyMapCanvas, stateMapCanvas, "literal_zoom_out")
            );
        } else if (usmap.zoomType == "jump") {
            var selector = new Function(
                "row",
                "args",
                `return args.layerId = ${stateMapCanvas.layers.length - 1}`
            );
            var newPredicates = function() {
                return {};
            };
            var newViewportBody = function(row, args) {
                var zoomFactor = REPLACE_ME_zoomfactor;
                var vpW = args.viewportW;
                var vpH = args.viewportH;
                return {
                    constant: [
                        row.bbox_x * zoomFactor - vpW / 2,
                        row.bbox_y * zoomFactor - vpH / 2
                    ]
                };
            };
            var newViewport = new Function(
                "row",
                "args",
                getBodyStringOfFunction(newViewportBody).replace(
                    /REPLACE_ME_zoomfactor/g,
                    usmap.zoomFactor
                )
            );
            var jumpName = function(row) {
                return "County map of " + row.name;
            };
            this.addJump(
                new Jump(
                    stateMapCanvas,
                    countyMapCanvas,
                    "geometric_semantic_zoom",
                    {
                        selector: selector,
                        viewport: newViewport,
                        predicates: newPredicates,
                        name: jumpName
                    }
                )
            );
        }
    }

    return {pyramid: canvases, view: args.view ? args.view : view};
}

module.exports = {
    addUSMap
};
