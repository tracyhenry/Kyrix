const Canvas = require("../Canvas").Canvas;
const View = require("../View").View;
const Layer = require("../Layer").Layer;
const Transform = require("../Transform").Transform;

/**
 * add a pie template
 * @param pie
 * @param args
 * @returns {{canvas: *, view: *}}
 */
function addPie(pie, args) {
    if (args == null) args = {};

    // add to project
    this.pies.push(pie);

    // construct canvas
    var pieCanvas;
    if ("canvas" in args) pieCanvas = args.canvas;
    else {
        pieCanvas = new Canvas(
            "pie" + (this.pies.length - 1),
            pie.width,
            pie.height
        );
        this.addCanvas(pieCanvas);
    }
    if (pieCanvas.w != pie.width || pieCanvas.h != pie.height)
        throw new Error("Adding Pie: canvas sizes do not match.");

    // add rendering params
    var rpKey = "pie_" + (this.pies.length - 1);
    var rpDict = {};
    rpDict[rpKey] = {
        dimensions: pie.query.dimensions,
        innerRadius: 70,
        outerRadius: pie.radius,
        cornerRadius: 5,
        padAngle: 0.01,
        colorScheme: pie.colorScheme,
        transition: pie.transition,
        legendTitle: pie.legend.title,
        legendDomain: pie.legend.domain
    };
    this.addRenderingParams(rpDict);

    // construct query
    // SELECT columns are from measureCol & pie.query.dimensions
    // merge them and then dedup
    var query = "SELECT " + pie.query.dimensions.join(", ");
    query += (pie.query.dimensions.length ? ", " : "") + pie.query.measure;
    query += " FROM " + pie.query.table + " GROUP BY ";
    query += pie.query.dimensions.join(", ");
    var pieTransform = new Transform(
        query,
        pie.db,
        "",
        pie.query.dimensions.concat(["kyrixAggValue"]),
        true,
        pie.query.dimensions.concat(pie.query.sampleFields)
    );

    // construct pie layer
    var pieLayer = new Layer(pieTransform, true);
    pieCanvas.addLayer(pieLayer);
    pieLayer.addRenderingFunc(pie.getPieRenderer());
    pieLayer.addTooltip(pie.tooltip.columns, pie.tooltip.aliases);
    pieLayer.setIndexerType("StaticAggregationIndexer");
    pieLayer.setPieId(this.pies.length - 1 + "_" + 0);

    // construct queries for the dummy sample layer
    // construct the dummy sample layer
    query =
        "SELECT " +
        pie.query.sampleFields.join(", ") +
        (pie.query.sampleFields.length ? ", " : "") +
        pie.query.dimensions.join(", ") +
        (pie.query.measureCol === "*"
            ? ""
            : (pie.query.sampleFields.length || pie.query.dimensions.length
                  ? ", "
                  : "") + pie.query.measureCol) +
        " FROM " +
        pie.query.table;

    // construct sample layer
    var sampleTransform = new Transform(query, pie.db, "", [], true);
    var sampleLayer = new Layer(sampleTransform, true);
    pieCanvas.addLayer(sampleLayer);
    sampleLayer.addRenderingFunc(function() {});
    sampleLayer.setIndexerType("StaticAggregationIndexer");

    // add stylesheet
    this.addStyles(__dirname + "/css/pie.css");

    // view
    if (!("view" in args)) {
        var view = new View(
            "pie" + (this.pies.length - 1),
            pie.width,
            pie.height
        );
        this.addView(view);
        this.setInitialStates(view, pieCanvas, 0, 0);
    } else if (!(args.view instanceof View)) {
        throw new Error("Adding Pie: view must be a View object");
    }

    return {canvas: pieCanvas, view: args.view ? args.view : view};
}

module.exports = {
    addPie
};
