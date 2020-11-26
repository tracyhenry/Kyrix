const Canvas = require("../Canvas").Canvas;
const View = require("../View").View;
const Jump = require("../Jump").Jump;
const Layer = require("../Layer").Layer;
const Transform = require("../Transform").Transform;

/**
 * Add an ssv to a project, this will create a hierarchy of canvases that form a pyramid shape
 * @param ssv an SSV object
 * @param args an dictionary that contains customization parameters, see doc
 */
function addSSV(ssv, args) {
    if (args == null) args = {};

    // add to project
    this.ssvs.push(ssv);

    // add stuff to renderingParam
    var renderingParams = {
        textwrap: require("./Utilities").textwrap,
        processClusterAgg: require("./SSV").processClusterAgg,
        serializePath: require("./Utilities").serializePath,
        translatePathSegments: require("./Utilities").translatePathSegments,
        parsePathIntoSegments: require("./Utilities").parsePathIntoSegments,
        aggKeyDelimiter: ssv.aggKeyDelimiter,
        loX: ssv.loX,
        loY: ssv.loY,
        hiX: ssv.hiX,
        hiY: ssv.hiY,
        bboxW: ssv.bboxW,
        bboxH: ssv.bboxH,
        zoomFactor: ssv.zoomFactor,
        fadeInDuration: 200,
        geoInitialLevel: ssv.geoInitialLevel,
        geoInitialCenterLat: ssv.geoLat,
        geoInitialCenterLon: ssv.geoLon
    };
    renderingParams = {
        ...renderingParams,
        ...ssv.clusterParams,
        ...ssv.aggregateParams,
        ...ssv.hoverParams,
        ...ssv.legendParams,
        ...ssv.axisParams
    };
    var rpKey = "ssv_" + (this.ssvs.length - 1);
    var rpDict = {};
    rpDict[rpKey] = renderingParams;
    this.addRenderingParams(rpDict);

    // construct canvases
    var curPyramid = [];
    var transform = new Transform(ssv.query, ssv.db, "", [], true);
    var numLevels = Math.min(
        ssv.numLevels,
        args.pyramid ? args.pyramid.length : 1e10
    );
    for (var i = 0; i < numLevels; i++) {
        var width = (ssv.topLevelWidth * Math.pow(ssv.zoomFactor, i)) | 0;
        var height = (ssv.topLevelHeight * Math.pow(ssv.zoomFactor, i)) | 0;

        // construct a new canvas
        var curCanvas;
        if (args.pyramid) {
            curCanvas = args.pyramid[i];
            if (
                Math.abs(curCanvas.width - width) > 1e-3 ||
                Math.abs(curCanvas.height - height) > 1e-3
            )
                throw new Error("Adding SSV: Canvas sizes do not match.");
        } else {
            curCanvas = new Canvas(
                "ssv" + (this.ssvs.length - 1) + "_" + "level" + i,
                width,
                height
            );
            this.addCanvas(curCanvas);
        }
        curPyramid.push(curCanvas);

        // create one layer
        var curLayer = new Layer(transform, false);
        curCanvas.addLayer(curLayer);

        // set fetching scheme
        if (ssv.clusterMode == "contour" || ssv.clusterMode == "heatmap")
            curLayer.setFetchingScheme("dbox", false);
        //curLayer.setFetchingScheme("tiling");

        // set ssv ID
        curLayer.setIndexerType("SSVInMemoryIndexer");
        //curLayer.setIndexerType("SSVCitusIndexer");
        curLayer.setSSVId(this.ssvs.length - 1 + "_" + i);

        // dummy placement
        curLayer.addPlacement({
            centroid_x: "con:0",
            centroid_y: "con:0",
            width: "con:0",
            height: "con:0"
        });

        // construct rendering function
        curLayer.addRenderingFunc(ssv.getLayerRenderer());

        // tooltips
        curLayer.addTooltip(ssv.tooltipColumns, ssv.tooltipAliases);

        // map layer
        if (ssv.mapBackground) {
            var mapLayer = new Layer(
                require("./Transform").defaultEmptyTransform,
                false
            );
            curCanvas.addLayer(mapLayer);
            mapLayer.addRenderingFunc(ssv.getMapRenderer());
            mapLayer.addPlacement({
                centroid_x: "con:0",
                centroid_y: "con:0",
                width: "con:0",
                height: "con:0"
            });
            mapLayer.setFetchingScheme("dbox", false);
            mapLayer.setSSVId(this.ssvs.length - 1 + "_" + i);
        }

        // add static legend layer
        var staticLayer = new Layer(null, true);
        curCanvas.addLayer(staticLayer);
        staticLayer.addRenderingFunc(ssv.getLegendRenderer());
        staticLayer.setSSVId(this.ssvs.length - 1 + "_" + i);

        // axes
        if (ssv.axis) {
            curCanvas.addAxes(
                ssv.getAxesRenderer(i),
                "ssv_" + (this.ssvs.length - 1)
            );
        }
    }

    // literal zooms
    for (var i = 0; i + 1 < ssv.numLevels; i++) {
        var hasLiteralZoomIn = false;
        var hasLiteralZoomOut = false;
        for (var j = 0; j < this.jumps.length; j++) {
            if (
                this.jumps[j].sourceId == curPyramid[i].id &&
                this.jumps[j].type == "literal_zoom_in"
            ) {
                if (this.jumps[j].destId != curPyramid[i + 1].id)
                    throw new Error(
                        "Adding SSV: malformed literal zoom pyramid."
                    );
                hasLiteralZoomIn = true;
            }
            if (
                this.jumps[j].sourceId == curPyramid[i + 1].id &&
                this.jumps[j].type == "literal_zoom_out"
            ) {
                if (this.jumps[j].destId != curPyramid[i].id)
                    throw new Error(
                        "Adding SSV: malformed literal zoom pyramid."
                    );
                hasLiteralZoomOut = true;
            }
        }
        if (!hasLiteralZoomIn)
            this.addJump(
                new Jump(curPyramid[i], curPyramid[i + 1], "literal_zoom_in")
            );
        if (!hasLiteralZoomOut)
            this.addJump(
                new Jump(curPyramid[i + 1], curPyramid[i], "literal_zoom_out")
            );
    }

    // create a new view if not specified
    if (!args.view) {
        var viewId = "ssv" + (this.ssvs.length - 1);
        var view = new View(viewId, ssv.topLevelWidth, ssv.topLevelHeight);
        this.addView(view);
        // initialize view
        this.setInitialStates(view, curPyramid[0], 0, 0);
    } else if (!(args.view instanceof View))
        throw new Error("Adding SSV: view must be a View object");

    return {pyramid: curPyramid, view: args.view ? args.view : view};
}

module.exports = {
    addSSV
};
