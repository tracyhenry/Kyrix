const Canvas = require("../Canvas").Canvas;
const View = require("../View").View;
const Layer = require("../Layer").Layer;
const Transform = require("../Transform").Transform;

/**
 * add a static template
 * @param staticTemplate
 * @param args
 * @returns {{canvas: *, view: *}}
 */
function addStaticTemplate(staticTemplate, args) {
    if (args == null) args = {};

    // add to project
    this.staticTemplates.push(staticTemplate);

    // construct canvas
    var staticTemplateCanvas;
    if ("canvas" in args) staticTemplateCanvas = args.canvas;
    else {
        staticTemplateCanvas = new Canvas(
            "staticTemplate" + (this.staticTemplates.length - 1),
            staticTemplate.width,
            staticTemplate.height
        );
        this.addCanvas(staticTemplateCanvas);
    }
    if (
        staticTemplateCanvas.w != staticTemplate.width ||
        staticTemplateCanvas.h != staticTemplate.height
    )
        throw new Error("Adding StaticTemplate: canvas sizes do not match.");

    // add rendering params
    var rpKey = "staticTemplate_" + (this.staticTemplates.length - 1);
    var rpDict = {};
    rpDict[rpKey] = {
        dimensions: staticTemplate.query.dimensions,
        stackDimensions: staticTemplate.query.stackDimensions,
        colorScheme: staticTemplate.colorScheme,
        transition: staticTemplate.transition,
        legendTitle: staticTemplate.legend.title
    };
    if (staticTemplate.type == "pie")
        rpDict[rpKey] = Object.assign({}, rpDict[rpKey], {
            legendDomain: staticTemplate.legend.domain,
            innerRadius: 70,
            outerRadius: staticTemplate.radius,
            cornerRadius: 5,
            padAngle: 0.01
        });
    else if (
        staticTemplate.type == "treemap" ||
        staticTemplate.type == "circlePack"
    )
        rpDict[rpKey] = Object.assign({}, rpDict[rpKey], {
            padding: staticTemplate.padding,
            textFields: staticTemplate.textFields
        });
    else if (staticTemplate.type == "bar")
        rpDict[rpKey] = Object.assign({}, rpDict[rpKey], {
            xAxisTitle: staticTemplate.axis.xTitle,
            yAxisTitle: staticTemplate.axis.yTitle
        });
    this.addRenderingParams(rpDict);

    // construct query
    // SELECT columns are from measureCol & staticTemplate.query.dimensions
    // merge them and then dedup
    var query = "SELECT ";
    var dimensions = staticTemplate.query.dimensions.concat(
        staticTemplate.query.stackDimensions
    );
    query += dimensions.join(", ") + ", " + staticTemplate.query.measure;
    query += " FROM " + staticTemplate.query.table + " GROUP BY ";
    query += dimensions.join(", ");
    var staticTemplateTransform = new Transform(
        query,
        staticTemplate.db,
        "",
        dimensions.concat(["kyrixAggValue"]),
        true,
        dimensions.concat(staticTemplate.query.sampleFields)
    );

    // construct static template layer
    var staticTemplateLayer = new Layer(staticTemplateTransform, true);
    staticTemplateCanvas.addLayer(staticTemplateLayer);
    staticTemplateLayer.addRenderingFunc(
        staticTemplate.getRenderer(staticTemplate.type)
    );
    staticTemplateLayer.addTooltip(
        staticTemplate.tooltip.columns,
        staticTemplate.tooltip.aliases
    );
    staticTemplateLayer.setIndexerType("StaticAggregationIndexer");
    staticTemplateLayer.setStaticTemplateId(
        this.staticTemplates.length - 1 + "_" + 0
    );

    // construct queries for the dummy sample layer
    // construct the dummy sample layer
    query =
        "SELECT " +
        staticTemplate.query.sampleFields.join(", ") +
        (staticTemplate.query.sampleFields.length ? ", " : "") +
        dimensions.join(", ") +
        (staticTemplate.query.measureCol === "*"
            ? ""
            : ", " + staticTemplate.query.measureCol) +
        " FROM " +
        staticTemplate.query.table;

    // construct sample layer
    var sampleTransform = new Transform(query, staticTemplate.db, "", [], true);
    var sampleLayer = new Layer(sampleTransform, true);
    staticTemplateCanvas.addLayer(sampleLayer);
    sampleLayer.addRenderingFunc(function() {});
    sampleLayer.setIndexerType("StaticAggregationIndexer");

    // add stylesheet
    if (staticTemplate.type == "pie")
        this.addStyles(__dirname + "/css/pie.css");

    // view
    if (!("view" in args)) {
        var view = new View(
            "staticTemplate" + (this.staticTemplates.length - 1),
            staticTemplate.width,
            staticTemplate.height
        );
        this.addView(view);
        this.setInitialStates(view, staticTemplateCanvas, 0, 0);
    } else if (!(args.view instanceof View)) {
        throw new Error("Adding StaticTemplate: view must be a View object");
    }

    return {canvas: staticTemplateCanvas, view: args.view ? args.view : view};
}

module.exports = {
    addStaticTemplate
};
