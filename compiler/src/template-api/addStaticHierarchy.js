const Canvas = require("../Canvas").Canvas;
const View = require("../View").View;
const Layer = require("../Layer").Layer;
const Transform = require("../Transform").Transform;

/**
 * add a static hierarchy template
 * @param staticHierarchy
 * @param args
 * @returns {{canvas: *, view: *}}
 */
function addStaticHierarchy(staticHierarchy, args) {
    if (args == null) args = {};

    // add to project
    this.staticHierarchies.push(staticHierarchy);

    // construct canvas
    var staticHierarchyCanvas;
    if ("canvas" in args) staticHierarchyCanvas = args.canvas;
    else {
        staticHierarchyCanvas = new Canvas(
            "staticHierarchy" + (this.staticHierarchies.length - 1),
            staticHierarchy.width,
            staticHierarchy.height
        );
        this.addCanvas(staticHierarchyCanvas);
    }
    if (
        staticHierarchyCanvas.w != staticHierarchy.width ||
        staticHierarchyCanvas.h != staticHierarchy.height
    )
        throw new Error("Adding Static Hierarchy: canvas sizes do not match.");

    // add rendering params
    var rpKey = "staticHierarchy_" + (this.staticHierarchies.length - 1);
    var rpDict = {};
    rpDict[rpKey] = {
        dimensions: staticHierarchy.query.dimensions,
        padding: staticHierarchy.padding,
        textFields: staticHierarchy.textFields,
        colorScheme: staticHierarchy.colorScheme,
        transition: staticHierarchy.transition,
        legendTitle: staticHierarchy.legend.title
    };
    this.addRenderingParams(rpDict);

    // construct query
    // SELECT columns are from measureCol & staticHierarchy.query.dimensions
    // merge them and then dedup
    var query = "SELECT " + staticHierarchy.query.dimensions.join(", ");
    query +=
        (staticHierarchy.query.dimensions.length ? ", " : "") +
        staticHierarchy.query.measure;
    query += " FROM " + staticHierarchy.query.table + " GROUP BY ";
    query += staticHierarchy.query.dimensions.join(", ");
    var staticHierarchyTransform = new Transform(
        query,
        staticHierarchy.db,
        "",
        staticHierarchy.query.dimensions.concat(["kyrixAggValue"]),
        true,
        staticHierarchy.query.dimensions.concat(
            staticHierarchy.query.sampleFields
        )
    );

    // construct static hierarchy layer
    var staticHierarchyLayer = new Layer(staticHierarchyTransform, true);
    staticHierarchyCanvas.addLayer(staticHierarchyLayer);
    staticHierarchyLayer.addRenderingFunc(
        staticHierarchy.type == "treemap"
            ? staticHierarchy.getStaticTreemapRenderer()
            : staticHierarchy.getStaticCirclePackRenderer()
    );
    staticHierarchyLayer.addTooltip(
        staticHierarchy.tooltip.columns,
        staticHierarchy.tooltip.aliases
    );
    staticHierarchyLayer.setIndexerType("StaticAggregationIndexer");
    staticHierarchyLayer.setStaticHierarchyId(
        this.staticHierarchies.length - 1 + "_" + 0
    );

    // construct queries for the dummy sample layer
    // construct the dummy sample layer
    query =
        "SELECT " +
        staticHierarchy.query.sampleFields.join(", ") +
        (staticHierarchy.query.sampleFields.length ? ", " : "") +
        staticHierarchy.query.dimensions.join(", ") +
        (staticHierarchy.query.measureCol === "*"
            ? ""
            : (staticHierarchy.query.sampleFields.length ||
              staticHierarchy.query.dimensions.length
                  ? ", "
                  : "") + staticHierarchy.query.measureCol) +
        " FROM " +
        staticHierarchy.query.table;

    // construct sample layer
    var sampleTransform = new Transform(
        query,
        staticHierarchy.db,
        "",
        [],
        true
    );
    var sampleLayer = new Layer(sampleTransform, true);
    staticHierarchyCanvas.addLayer(sampleLayer);
    sampleLayer.addRenderingFunc(function() {});
    sampleLayer.setIndexerType("StaticAggregationIndexer");

    // view
    if (!("view" in args)) {
        var view = new View(
            "staticHierarchy" + (this.staticHierarchies.length - 1),
            staticHierarchy.width,
            staticHierarchy.height
        );
        this.addView(view);
        this.setInitialStates(view, staticHierarchyCanvas, 0, 0);
    } else if (!(args.view instanceof View)) {
        throw new Error("Adding Static Hierarchy: view must be a View object");
    }

    return {canvas: staticHierarchyCanvas, view: args.view ? args.view : view};
}

module.exports = {
    addStaticHierarchy
};
