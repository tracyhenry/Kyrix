const Canvas = require("../Canvas").Canvas;
const View = require("../View").View;
const Layer = require("../Layer").Layer;
const Transform = require("../Transform").Transform;

/**
 * add a static treemap template
 * @param staticTreemap
 * @param args
 * @returns {{canvas: *, view: *}}
 */
function addStaticTreemap(staticTreemap, args) {
    if (args == null) args = {};

    // add to project
    this.staticTreemaps.push(staticTreemap);

    // construct canvas
    var staticTreemapCanvas;
    if ("canvas" in args) staticTreemapCanvas = args.canvas;
    else {
        staticTreemapCanvas = new Canvas(
            "staticTreemap" + (this.staticTreemaps.length - 1),
            staticTreemap.width,
            staticTreemap.height
        );
        this.addCanvas(staticTreemapCanvas);
    }
    if (
        staticTreemapCanvas.w != staticTreemap.width ||
        staticTreemapCanvas.h != staticTreemap.height
    )
        throw new Error("Adding Static Treemap: canvas sizes do not match.");

    // add rendering params
    var rpKey = "staticTreemap_" + (this.staticTreemaps.length - 1);
    var rpDict = {};
    rpDict[rpKey] = {
        dimensions: staticTreemap.query.dimensions,
        colorScheme: staticTreemap.colorScheme,
        transition: staticTreemap.transition,
        legendTitle: staticTreemap.legend.title,
        padding: staticTreemap.padding
    };
    this.addRenderingParams(rpDict);

    // construct query
    // SELECT columns are from measureCol & staticTreemap.query.dimensions
    // merge them and then dedup
    var query = "SELECT " + staticTreemap.query.dimensions.join(", ");
    query +=
        (staticTreemap.query.dimensions.length ? ", " : "") +
        staticTreemap.query.measure;
    query += " FROM " + staticTreemap.query.table + " GROUP BY ";
    query += staticTreemap.query.dimensions.join(", ");
    var staticTreemapTransform = new Transform(
        query,
        staticTreemap.db,
        "",
        staticTreemap.query.dimensions.concat(["kyrixAggValue"]),
        true,
        staticTreemap.query.dimensions.concat(staticTreemap.query.sampleFields)
    );

    // construct static treemap layer
    var staticTreemapLayer = new Layer(staticTreemapTransform, true);
    staticTreemapCanvas.addLayer(staticTreemapLayer);
    staticTreemapLayer.addRenderingFunc(
        staticTreemap.getStaticTreemapRenderer()
    );
    staticTreemapLayer.addTooltip(
        staticTreemap.tooltip.columns,
        staticTreemap.tooltip.aliases
    );
    staticTreemapLayer.setIndexerType("StaticAggregationIndexer");
    staticTreemapLayer.setStaticTreemapId(
        this.staticTreemaps.length - 1 + "_" + 0
    );

    // construct queries for the dummy sample layer
    // construct the dummy sample layer
    query =
        "SELECT " +
        staticTreemap.query.sampleFields.join(", ") +
        (staticTreemap.query.sampleFields.length ? ", " : "") +
        staticTreemap.query.dimensions.join(", ") +
        (staticTreemap.query.measureCol === "*"
            ? ""
            : (staticTreemap.query.sampleFields.length ||
              staticTreemap.query.dimensions.length
                  ? ", "
                  : "") + staticTreemap.query.measureCol) +
        " FROM " +
        staticTreemap.query.table;

    // construct sample layer
    var sampleTransform = new Transform(query, staticTreemap.db, "", [], true);
    var sampleLayer = new Layer(sampleTransform, true);
    staticTreemapCanvas.addLayer(sampleLayer);
    sampleLayer.addRenderingFunc(function() {});
    sampleLayer.setIndexerType("StaticAggregationIndexer");

    // view
    if (!("view" in args)) {
        var view = new View(
            "staticTreemap" + (this.staticTreemaps.length - 1),
            staticTreemap.width,
            staticTreemap.height
        );
        this.addView(view);
        this.setInitialStates(view, staticTreemapCanvas, 0, 0);
    } else if (!(args.view instanceof View)) {
        throw new Error("Adding Static Treemap: view must be a View object");
    }

    return {canvas: staticTreemapCanvas, view: args.view ? args.view : view};
}

module.exports = {
    addStaticTreemap
};
