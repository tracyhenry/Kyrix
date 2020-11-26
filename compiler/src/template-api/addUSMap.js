const Canvas = require("../Canvas").Canvas;
const View = require("../View").View;
const Jump = require("../Jump").Jump;
const Layer = require("../Layer").Layer;
const Transform = require("../Transform").Transform;
const getBodyStringOfFunction = require("./Utilities").getBodyStringOfFunction;

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
    else {
        stateMapCanvas = new Canvas(
            "usmap" + (this.usmaps.length - 1) + "_" + "state",
            usmap.stateMapWidth,
            usmap.stateMapHeight
        );
        this.addCanvas(stateMapCanvas);
    }
    if (
        stateMapCanvas.w != usmap.stateMapWidth ||
        stateMapCanvas.h != usmap.stateMapHeight
    )
        throw new Error("Adding USMap: state canvas sizes do not match");

    // static legends layer
    var stateMapLegendLayer = new Layer(null, true);
    stateMapCanvas.addLayer(stateMapLegendLayer);
    stateMapLegendLayer.addRenderingFunc(
        usmap.getUSMapRenderer("stateMapLegendRendering")
    );
    stateMapLegendLayer.setUSMapId(this.usmaps.length - 1 + "_" + 0);

    // state boundary layer
    var stateMapTransform = new Transform(
        `SELECT name, ${usmap.stateRateCol}, geomstr 
         FROM ${usmap.stateTable}`,
        usmap.db,
        usmap.getUSMapTransformFunc("stateMapTransform"),
        ["bbox_x", "bbox_y", "name", "rate", "geomstr"],
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
    stateBoundaryLayer.addTooltip(
        ["name", "rate"],
        ["State", usmap.tooltipAlias]
    );
    stateBoundaryLayer.setUSMapId(this.usmaps.length - 1 + "_" + 0);

    // add to canvases (return)
    canvases.push(stateMapCanvas);

    // ==========  Views ===============
    if (!("view" in args)) {
        var view = new View(
            "usmap" + (this.usmaps.length - 1),
            usmap.stateMapWidth,
            usmap.stateMapHeight
        );
        this.addView(view);
        this.setInitialStates(view, stateMapCanvas, 0, 0);
    } else if (!(args.view instanceof View)) {
        throw new Error("Adding USMap: view must be a View object");
    }

    // ================== county map canvas ===================
    if ("countyTable" in usmap) {
        var countyMapCanvas;
        if ("pyramid" in args) countyMapCanvas = args.pyramid[1];
        else {
            countyMapCanvas = new Canvas(
                "usmap" + (this.usmaps.length - 1) + "_" + "county",
                usmap.stateMapWidth * usmap.zoomFactor,
                usmap.stateMapHeight * usmap.zoomFactor
            );
            this.addCanvas(countyMapCanvas);
        }
        if (
            countyMapCanvas.w != usmap.stateMapWidth * usmap.zoomFactor ||
            countyMapCanvas.h != usmap.stateMapHeight * usmap.zoomFactor
        )
            throw new Error("Adding USMap: county canvas sizes do not match");

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
        var countyMapTransform = new Transform(
            `SELECT name, ${usmap.countyRateCol}, geomstr
        FROM ${usmap.countyTable};`,
            usmap.db,
            usmap.getUSMapTransformFunc("countyMapTransform"),
            ["bbox_x", "bbox_y", "bbox_w", "bbox_h", "name", "rate", "geomstr"],
            true
        );
        var countyBoundaryLayer = new Layer(countyMapTransform, false);
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
            ["name", "rate"],
            ["County", usmap.tooltipAlias]
        );
        countyBoundaryLayer.setUSMapId(this.usmaps.length - 1 + "_" + 1);

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
