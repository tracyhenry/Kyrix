/**
 * Constructor of an AutoDD object
 * @param args
 * @constructor
 */
function AutoDD(args) {
    // query, db, xCol, yCol, bboxW, bboxH
    if (args == null) args = {};

    // renderingMode: object only, object+clusternum, circle+object, circle only
    if (!("renderingMode" in args))
        throw new Error("Constructing AutoDD: renderingMode missing.");
    var allRenderingModes = new Set([
        "object only",
        "object+clusternum",
        "circle+object",
        "circle only"
    ]);
    if (!allRenderingModes.has(args.renderingMode))
        throw new Error("Constructing AutoDD: unsupported rendering mode.");

    // check constraints according to rendering mode
    this.circleMinSize = 30;
    this.circleMaxSize = 70;
    if (
        args.renderingMode == "circle only" ||
        args.renderingMode == "circle+object"
    )
        args.bboxW = args.bboxH = this.circleMaxSize * 2;
    if (
        (args.renderingMode == "object only" ||
            args.renderingMode == "object+clusternum" ||
            args.renderingMode == "circle+object") &&
        !("rendering" in args)
    )
        throw new Error("Constructing AutoDD: object renderer missing.");
    if (
        (args.renderingMode == "circle+object" ||
            args.renderingMode == "circle only") &&
        !("roughN" in args)
    )
        throw new Error(
            "Constructing AutoDD: A rough estimate of total objects (roughN) is missing for circle rendering modes."
        );

    // check required args
    var requiredArgs = [
        "query",
        "db",
        "xCol",
        "yCol",
        "renderingMode",
        "bboxW",
        "bboxH"
    ];
    var requiredArgsTypes = [
        "string",
        "string",
        "string",
        "string",
        "string",
        "number",
        "number"
    ];
    for (var i = 0; i < requiredArgs.length; i++) {
        if (!(requiredArgs[i] in args))
            throw new Error(
                "Constructing AutoDD: " + requiredArgs[i] + " missing."
            );
        if (typeof args[requiredArgs[i]] !== requiredArgsTypes[i])
            throw new Error(
                "Constructing AutoDD: " +
                    requiredArgs[i] +
                    " must be " +
                    requiredArgsTypes[i] +
                    "."
            );
        if (requiredArgsTypes[i] == "string")
            if (args[requiredArgs[i]].length == 0)
                throw new Error(
                    "Constructing AutoDD: " +
                        requiredArgs[i] +
                        " cannot be an empty string."
                );
    }

    // other constraints
    if ("rendering" in args && (!("bboxW" in args) || !("bboxH" in args)))
        throw new Error(
            "Constructing AutoDD: sizes of object bounding box are not specified."
        );
    if (args.bboxW <= 0 || args.bboxH <= 0)
        throw new Error("Constructing AutoDD: non-positive bbox size.");
    if (
        "axis" in args &&
        (!"loX" in args || !"loY" in args || !"hiX" in args || !"hiY" in args)
    )
        throw new Error(
            "Constructing AutoDD: raw data domain needs to be specified for rendering an axis."
        );
    if (
        ("loX" in args || "loY" in args || "hiX" in args || "hiY" in args) &&
        !("loX" in args && "loY" in args && "hiX" in args && "hiY" in args)
    )
        throw new Error(
            "Constructing AutoDD: loX, loY, hiX, hiY must all be provided."
        );

    // assign fields
    for (var i = 0; i < requiredArgs.length; i++)
        this[requiredArgs[i]] = args[requiredArgs[i]];
    this.rendering = "rendering" in args ? args.rendering : null;
    this.columnNames = "columnNames" in args ? args.columnNames : [];
    this.numLevels = "numLevels" in args ? args.numLevels : 5;
    this.topLevelWidth = "topLevelWidth" in args ? args.topLevelWidth : 1000;
    this.topLevelHeight = "topLevelHeight" in args ? args.topLevelHeight : 1000;
    this.zoomFactor = "zoomFactor" in args ? args.zoomFactor : 2;
    this.roughN = "roughN" in args ? args.roughN : null;
    this.overlap = "overlap" in args ? (args.overlap ? true : false) : false;
    this.axis = "axis" in args ? args.axis : false;
    this.loX = "loX" in args ? args.loX : null;
    this.loY = "loY" in args ? args.loY : null;
    this.hiX = "hiX" in args ? args.hiX : null;
    this.hiY = "hiY" in args ? args.hiY : null;
}

/**
 * get rendering function for an autodd layer based on rendering mode
 * @param renderingMode
 * @param objectRenderer - user specified object renderer
 * @returns {Function}
 */
function getLayerRenderer() {
    if (
        this.renderingMode == "circle only" ||
        this.renderingMode == "circle+object"
    ) {
        var maxCircleDigit = this.roughN.toString().length;
        var renderFuncBody =
            "var objectRenderer = " + this.rendering.toString() + ";\n";
        renderFuncBody +=
            "var params = args.renderingParams;\n" +
            "var circleSizeInterpolator = d3.scaleLinear()\n" +
            "       .domain([1, " +
            maxCircleDigit +
            "])\n" +
            "       .range([params.circleMinSize, params.circleMaxSize]);\n" +
            'var g = svg.append("g");\n' +
            'g.selectAll("circle")\n' +
            "   .data(data)\n" +
            "   .enter()\n" +
            '   .append("circle")\n' +
            '   .attr("r", function (d) {\n' +
            "           return circleSizeInterpolator(d.cluster_num.length);\n" +
            "   })\n" +
            '   .attr("cx", function (d) {return d.cx;})\n' +
            '   .attr("cy", function (d) {return d.cy;})\n' +
            '   .style("fill-opacity", .25)\n' +
            '   .attr("fill", "honeydew")\n' +
            '   .attr("stroke", "#ADADAD")\n' +
            '   .style("stroke-width", "1px")';
        if (this.renderingMode == "circle+object")
            // set onhover listeners for circles
            renderFuncBody +=
                "\n" +
                '   .on("mouseover", function (d) {\n' +
                "        objectRenderer(svg, [d], args);\n" +
                '        svg.selectAll("g:last-of-type")\n' +
                '            .attr("id", "autodd_tooltip")\n' +
                '            .style("opacity", 0.8)\n' +
                '            .style("pointer-events", "none")\n' +
                '            .selectAll("*")\n' +
                '            .each(function() {zoomRescale("' +
                this.viewId +
                '", this);});\n' +
                "    })\n" +
                '    .on("mouseleave", function() {\n' +
                '        d3.select("#autodd_tooltip")\n' +
                "           .remove();\n" +
                "    });\n";
        else renderFuncBody += ";\n";
        renderFuncBody +=
            '    g.selectAll("text")\n' +
            "        .data(data)\n" +
            "        .enter()\n" +
            '        .append("text")\n' +
            '        .attr("dy", "0.3em")\n' +
            "        .text(function (d) {return d.cluster_num.toString();})\n" +
            '        .attr("font-size", function (d) {\n' +
            "           return circleSizeInterpolator(d.cluster_num.length) / 2;\n" +
            "        })\n" +
            '        .attr("x", function(d) {return d.cx;})\n' +
            '        .attr("y", function(d) {return d.cy;})\n' +
            '        .attr("dy", ".35em")\n' +
            '        .attr("text-anchor", "middle")\n' +
            '        .style("fill-opacity", 1)\n' +
            '        .style("fill", "navy")\n' +
            '        .style("pointer-events", "none")' +
            "        .each(function (d) {\n" +
            "            params.textwrap(d3.select(this), circleSizeInterpolator(d.cluster_num.length) * 1.5);\n" +
            "        });";
        return new Function("svg", "data", "args", renderFuncBody);
    } else if (
        this.renderingMode == "object only" ||
        this.renderingMode == "object+clusternum"
    ) {
        var renderFuncBody =
            "(" + this.rendering.toString() + ")(svg, data, args);\n";
        if (this.renderingMode == "object+clusternum")
            renderFuncBody +=
                'var g = svg.select("g:last-of-type");' +
                'g.selectAll(".clusternum")' +
                ".data(data)" +
                ".enter()" +
                '.append("text")' +
                ".text(function(d) {return d.cluster_num;})" +
                '.attr("x", function(d) {return +d.cx;})' +
                '.attr("y", function(d) {return +d.miny;})' +
                '.attr("dy", ".35em")' +
                '.attr("font-size", 20)' +
                '.attr("text-anchor", "middle")' +
                '.attr("fill", "#f47142")' +
                '.style("fill-opacity", 1);';
        return new Function("svg", "data", "args", renderFuncBody);
    }
}

// get axes renderer
function getAxesRenderer(level) {
    var xOffset = (this.bboxW / 2) * Math.pow(this.zoomFactor, level);
    var yOffset = (this.bboxH / 2) * Math.pow(this.zoomFactor, level);
    var axesFuncBody =
        "var cWidth = args.canvasW, cHeight = args.canvasH, axes = [];\n" +
        "var styling = function (axesg) {\n" +
        '   axesg.selectAll(".tick line").attr("stroke", "#777").attr("stroke-dasharray", "3,10");\n' +
        '   axesg.style("font", "20px arial");\n' +
        '   axesg.selectAll("path").remove();\n' +
        "};\n" +
        "//x \n" +
        "var x = d3.scaleLinear()" +
        "   .domain([" +
        this.loX +
        ", " +
        this.hiX +
        "])" +
        "   .range([" +
        xOffset +
        ", cWidth - " +
        xOffset +
        "]);\n" +
        "var xAxis = d3.axisTop().tickSize(-cHeight); " +
        'axes.push({"dim": "x", "scale": x, "axis": xAxis, "translate": [0, 0], "styling": styling});\n' +
        "//y \n" +
        "var y = d3.scaleLinear()" +
        "   .domain([" +
        this.loY +
        ", " +
        this.hiY +
        "])" +
        "   .range([" +
        yOffset +
        ", cHeight - " +
        yOffset +
        "]);\n" +
        "var yAxis = d3.axisLeft().tickSize(-cWidth);\n" +
        'axes.push({"dim": "y", "scale": y, "axis": yAxis, "translate": [0, 0], "styling": styling});\n' +
        "return axes;";
    return new Function("args", axesFuncBody);
}

//define prototype
AutoDD.prototype = {
    getLayerRenderer: getLayerRenderer,
    getAxesRenderer: getAxesRenderer
};

// exports
module.exports = {
    AutoDD: AutoDD,
    getLayerRenderer: getLayerRenderer,
    getAxesRenderer: getAxesRenderer
};
