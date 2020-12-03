const Canvas = require("../Canvas").Canvas;
const View = require("../View").View;
const Layer = require("../Layer").Layer;
const Transform = require("../Transform").Transform;

/**
 * add a static aggregation
 * @param staticAggregation
 * @param args
 * @returns {{canvas: *, view: *}}
 */
function addStaticAggregation(staticAggregation, args) {
    if (args == null) args = {};

    // add to project
    this.staticAggregations.push(staticAggregation);

    // construct canvas
    var staticAggregationCanvas;
    if ("canvas" in args) staticAggregationCanvas = args.canvas;
    else {
        staticAggregationCanvas = new Canvas(
            "staticAggregation" + (this.staticAggregations.length - 1),
            staticAggregation.width,
            staticAggregation.height
        );
        this.addCanvas(staticAggregationCanvas);
    }
    if (
        staticAggregationCanvas.w != staticAggregation.width ||
        staticAggregationCanvas.h != staticAggregation.height
    )
        throw new Error("Adding StaticAggregation: canvas sizes do not match.");

    // add rendering params
    var rpKey = "staticAggregation_" + (this.staticAggregations.length - 1);
    var rpDict = {};
    rpDict[rpKey] = {
        dimensions: staticAggregation.query.dimensions,
        stackDimensions: staticAggregation.query.stackDimensions,
        colorScheme: staticAggregation.colorScheme,
        transition: staticAggregation.transition,
        legendTitle: staticAggregation.legend.title
    };
    if (staticAggregation.type == "pie")
        rpDict[rpKey] = Object.assign({}, rpDict[rpKey], {
            legendDomain: staticAggregation.legend.domain,
            innerRadius: 70,
            outerRadius: staticAggregation.radius,
            cornerRadius: 5,
            padAngle: 0.01
        });
    else if (
        staticAggregation.type == "treemap" ||
        staticAggregation.type == "circlePack"
    )
        rpDict[rpKey] = Object.assign({}, rpDict[rpKey], {
            padding: staticAggregation.padding,
            textFields: staticAggregation.textFields
        });
    else if (staticAggregation.type == "bar")
        rpDict[rpKey] = Object.assign({}, rpDict[rpKey], {
            legendDomain: staticAggregation.legend.domain,
            xAxisTitle: staticAggregation.axis.xTitle,
            yAxisTitle: staticAggregation.axis.yTitle
        });
    this.addRenderingParams(rpDict);

    // construct query
    // SELECT columns are from measureCol & staticAggregation.query.dimensions
    // merge them and then dedup
    var query = "SELECT ";
    var dimensions = staticAggregation.query.dimensions.concat(
        staticAggregation.query.stackDimensions
    );
    query += dimensions.join(", ") + ", " + staticAggregation.query.measure;
    query += " FROM " + staticAggregation.query.table + " GROUP BY ";
    query += dimensions.join(", ");
    var staticAggregationTransform = new Transform(
        query,
        staticAggregation.db,
        "",
        dimensions.concat(["kyrixAggValue"]),
        true,
        dimensions.concat(staticAggregation.query.sampleFields)
    );

    // construct static aggregation layer
    var staticAggregationLayer = new Layer(staticAggregationTransform, true);
    staticAggregationCanvas.addLayer(staticAggregationLayer);
    staticAggregationLayer.addRenderingFunc(
        staticAggregation.getRenderer(staticAggregation.type)
    );
    staticAggregationLayer.addTooltip(
        staticAggregation.tooltip.columns,
        staticAggregation.tooltip.aliases
    );
    staticAggregationLayer.setIndexerType("StaticAggregationIndexer");
    staticAggregationLayer.setStaticAggregationId(
        this.staticAggregations.length - 1 + "_" + 0
    );

    // construct queries for the dummy sample layer
    // construct the dummy sample layer
    query =
        "SELECT " +
        staticAggregation.query.sampleFields.join(", ") +
        (staticAggregation.query.sampleFields.length ? ", " : "") +
        dimensions.join(", ") +
        (staticAggregation.query.measureCol === "*"
            ? ""
            : ", " + staticAggregation.query.measureCol) +
        " FROM " +
        staticAggregation.query.table;

    // construct sample layer
    var sampleTransform = new Transform(
        query,
        staticAggregation.db,
        "",
        [],
        true
    );
    var sampleLayer = new Layer(sampleTransform, true);
    staticAggregationCanvas.addLayer(sampleLayer);
    sampleLayer.addRenderingFunc(function() {});
    sampleLayer.setIndexerType("StaticAggregationIndexer");

    // add stylesheet
    if (staticAggregation.type == "pie")
        this.addStyles(__dirname + "/css/pie.css");

    // view
    if (!("view" in args)) {
        var view = new View(
            "staticAggregation" + (this.staticAggregations.length - 1),
            staticAggregation.width,
            staticAggregation.height
        );
        this.addView(view);
        this.setInitialStates(view, staticAggregationCanvas, 0, 0);
    } else if (!(args.view instanceof View)) {
        throw new Error("Adding StaticAggregation: view must be a View object");
    }

    return {
        canvas: staticAggregationCanvas,
        view: args.view ? args.view : view
    };
}

module.exports = {
    addStaticAggregation
};
