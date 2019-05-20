/**
 * Constructor of an AutoDD object
 * @param args
 * @constructor
 */
function AutoDD(args) {

    // query, db, xCol, yCol, bboxW, bboxH
    if (args == null)
        args = {};

    // check required args
    var requiredArgs = ["query", "db", "xCol", "yCol", "bboxW", "bboxH"];
    var requiredArgsTypes = ["string", "string", "string", "string", "number", "number"];
    for (var i = 0; i < requiredArgs.length; i ++) {
        if (! (requiredArgs[i] in args))
            throw new Error("Constructing AutoDD: " + requiredArgs[i] + " missing.");
        if (typeof args[requiredArgs[i]] !== requiredArgsTypes[i])
            throw new Error("Constructing AutoDD: " + requiredArgs[i] + " must be " + requiredArgsTypes[i] + ".");
        if (requiredArgsTypes[i] == "string")
            if (args[requiredArgs[i]].length == 0)
                throw new Error("Constructing AutoDD: " + requiredArgs[i] + " cannot be an empty string.");
    }

    // other constraints
    if (args["bboxW"] <= 0 || args["bboxH"] <= 0)
        throw new Error("Constructing AutoDD: non-positive bbox size.");
    if ("axis" in args && (! "loX" in args || ! "loY" in args || ! "hiX" in args || ! "hiY" in args))
        throw new Error("Constructing AutoDD: raw data domain needs to be specified for rendering an axis.");
    if (("loX" in args || "loY" in args || "hiX" in args || "hiY" in args) &&
        ! ("loX" in args && "loY" in args && "hiX" in args && "hiY" in args))
        throw new Error("Constructing AutoDD: loX, loY, hiX, hiY must all be provided.");

    // assign fields
    for (var i = 0; i < requiredArgs.length; i ++)
        this[requiredArgs[i]] = args[requiredArgs[i]];
    this.rendering = ("rendering" in args ? args.rendering : null);
    this.clusterNum = ("clusterNum" in args ? args.clusterNum : false);
    this.columnNames = ("columnNames" in args ? args.columnNames : []);
    this.numLevels = ("numLevels" in args ? args.numLevels : 5);
    this.topLevelWidth = ("topLevelWidth" in args ? args.topLevelWidth : 1000);
    this.topLevelHeight = ("topLevelHeight" in args ? args.topLevelHeight : 1000);
    this.zoomFactor = ("zoomFactor" in args ? args.zoomFactor : 2);
    this.axis = ("axis" in args ? args.axis : false);
    this.loX = ("loX" in args ? args.loX : null);
    this.loY = ("loY" in args ? args.loY : null);
    this.hiX = ("hiX" in args ? args.hiX : null);
    this.hiY = ("hiY" in args ? args.hiY : null);
};

// get object rendering function
function getObjectRenderer(udfRenderer, hasClusterNum) {

    // TODO: add default circle-based renderer
    var renderFuncBody = (udfRenderer == null ? "" : "(" + udfRenderer.toString() + ")(svg, data, args);") + "\n";
    if (hasClusterNum)
        renderFuncBody += "var g = svg.select(\"g:last-of-type\");" +
            "g.selectAll(\".clusternum\")" +
            ".data(data)" +
            ".enter()" +
            ".append(\"text\")" +
            ".text(function(d) {return d.cluster_num;})" +
            ".attr(\"x\", function(d) {return +d.cx;})" +
            ".attr(\"y\", function(d) {return +d.miny;})" +
            ".attr(\"dy\", \".35em\")" +
            ".attr(\"font-size\", 20)" +
            ".attr(\"text-anchor\", \"middle\")" +
            ".attr(\"fill\", \"#f47142\")" +
            ".style(\"fill-opacity\", 1);";
    return new Function("svg", "data", "args", renderFuncBody);
}

function getAxesRenderer(loX, loY, hiX, hiY, xOffset, yOffset) {

    var axesFuncBody = "var cWidth = args.canvasW, cHeight = args.canvasH, axes = [];\n" +
        "//x \n" +
        "var x = d3.scaleLinear()" +
        "   .domain([" + loX + ", " + hiX + "])" +
        "   .range([" + xOffset + ", cWidth - " + xOffset + "]);\n" +
        "var xAxis = d3.axisTop().tickSize(-cHeight); " +
        "axes.push({\"dim\": \"x\", \"scale\": x, \"axis\": xAxis, \"translate\": [0, 0]});\n" +
        "//y \n" +
        "var y = d3.scaleLinear()" +
        "   .domain([" + loY + ", " + hiY + "])" +
        "   .range([" + yOffset + ", cHeight - " + yOffset + "]);\n" +
        "var yAxis = d3.axisLeft().tickSize(-cWidth); " +
        "axes.push({\"dim\": \"y\", \"scale\": y, \"axis\": yAxis, \"translate\": [0, 0]});\n" +
        "return axes;";
    return new Function("args", axesFuncBody);
}

// exports
module.exports = {
    AutoDD : AutoDD,
    getObjectRenderer : getObjectRenderer,
    getAxesRenderer : getAxesRenderer
};
