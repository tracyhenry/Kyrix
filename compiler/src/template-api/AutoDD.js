const getBodyStringOfFunction = require("./Renderers").getBodyStringOfFunction;

/**
 * Constructor of an AutoDD object
 * @param args
 * @constructor
 */
function AutoDD(args) {
    if (args == null) args = {};

    if (!("rendering" in args) || !("mode" in args.rendering))
        throw new Error(
            "Constructing AutoDD: rendering mode (rendering.mode) missing."
        );
    var allRenderingModes = new Set([
        "object only",
        "object+clusternum",
        "circle+object",
        "circle only",
        "contour only",
        "contour+object"
    ]);
    if (!allRenderingModes.has(args.rendering.mode))
        throw new Error("Constructing AutoDD: unsupported rendering mode.");

    // check constraints according to rendering mode
    this.circleMinSize = 30;
    this.circleMaxSize = 70;
    this.contourBandwidth = 30;
    if (
        args.rendering.mode == "circle only" ||
        args.rendering.mode == "circle+object"
    ) {
        args.rendering["obj"]["bboxW"] = args.rendering["obj"]["bboxH"] =
            this.circleMaxSize * 2;
        if (!("roughN" in args.rendering))
            throw new Error(
                "Constructing AutoDD: A rough estimate of total objects (rendering.roughN) is missing for circle rendering modes."
            );
    }
    if (
        (args.rendering.mode == "object only" ||
            args.rendering.mode == "object+clusternum" ||
            args.rendering.mode == "circle+object" ||
            args.rendering.mode == "contour+object") &&
        (!("obj" in args.rendering) || !("renderer" in args.rendering.obj))
    )
        throw new Error(
            "Constructing AutoDD: object renderer (rendering.obj.renderer) missing."
        );
    if (
        args.rendering.mode == "contour only" ||
        args.rendering.mode == "contour+object"
    ) {
        if (!("roughN" in args.rendering))
            throw new Error(
                "Constructing AutoDD: A rough estimate of total objects (rendering.roughN) is missing for KDE rendering modes."
            );
        if (!("obj" in args.rendering)) args.rendering.obj = {};
        args.rendering["obj"]["bboxW"] = args.rendering["obj"]["bboxH"] =
            this.contourBandwidth * 8; // as what's implemented by d3-contour
    }

    // check required args
    var requiredArgs = [
        ["data", "query"],
        ["data", "db"],
        ["x", "col"],
        ["x", "range"],
        ["y", "col"],
        ["y", "range"],
        ["rendering", "mode"],
        ["rendering", "obj", "bboxW"],
        ["rendering", "obj", "bboxH"]
    ];
    var requiredArgsTypes = [
        "string",
        "string",
        "string",
        "object",
        "string",
        "object",
        "string",
        "number",
        "number"
    ];
    for (var i = 0; i < requiredArgs.length; i++) {
        var curObj = args;
        for (var j = 0; j < requiredArgs[i].length; j++)
            if (!(requiredArgs[i][j] in curObj))
                throw new Error(
                    "Constructing AutoDD: " +
                        requiredArgs[i].join(".") +
                        " missing."
                );
            else curObj = curObj[requiredArgs[i][j]];
        if (typeof curObj !== requiredArgsTypes[i])
            throw new Error(
                "Constructing AutoDD: " +
                    requiredArgs[i].join(".") +
                    " must be typed " +
                    requiredArgsTypes[i] +
                    "."
            );
        if (requiredArgsTypes[i] == "string")
            if (curObj.length == 0)
                throw new Error(
                    "Constructing AutoDD: " +
                        requiredArgs[i].join(".") +
                        " cannot be an empty string."
                );
    }

    // other constraints
    if (args.rendering.obj.bboxW <= 0 || args.rendering.obj.bboxH <= 0)
        throw new Error("Constructing AutoDD: non-positive bbox size.");
    if (
        args.x.range != null &&
        (!Array.isArray(args.x.range) ||
            args.x.range.length != 2 ||
            typeof args.x.range[0] != "number" ||
            typeof args.x.range[1] != "number")
    )
        throw new Error("Construcitn AutoDD: malformed x.range");
    if (
        args.y.range != null &&
        (!Array.isArray(args.y.range) ||
            args.y.range.length != 2 ||
            typeof args.y.range[0] != "number" ||
            typeof args.y.range[1] != "number")
    )
        throw new Error("Construcitn AutoDD: malformed y.range");
    if (
        "axis" in args.rendering &&
        (args.x.range == null || args.y.range == null)
    )
        throw new Error(
            "Constructing AutoDD: raw data domain needs to be specified for rendering an axis."
        );
    if (
        (args.x.range != null && args.y.range == null) ||
        (args.x.range == null && args.y.range != null)
    )
        throw new Error(
            "Constructing AutoDD: x range and y range must both be provided."
        );

    // assign fields
    this.query = args.data.query;
    this.db = args.data.db;
    this.xCol = args.x.col;
    this.yCol = args.y.col;
    this.bboxW = args.rendering.obj.bboxW;
    this.bboxH = args.rendering.obj.bboxH;
    this.renderingMode = args.rendering.mode;
    this.rendering =
        "renderer" in args.rendering.obj ? args.rendering.obj.renderer : null;
    this.columnNames = "columnNames" in args.data ? args.data.columnNames : [];
    this.numLevels =
        "numLevels" in args.rendering ? args.rendering.numLevels : 10;
    this.topLevelWidth =
        "topLevelWidth" in args.rendering ? args.rendering.topLevelWidth : 1000;
    this.topLevelHeight =
        "topLevelHeight" in args.rendering
            ? args.rendering.topLevelHeight
            : 1000;
    this.zoomFactor =
        "zoomFactor" in args.rendering ? args.rendering.zoomFactor : 2;
    this.roughN = "roughN" in args.rendering ? args.rendering.roughN : null;
    this.overlap =
        "overlap" in args.rendering.obj
            ? args.rendering.obj.overlap
                ? true
                : false
            : this.renderingMode == "contour only" ||
              this.renderingMode == "contour+object"
            ? true
            : false;
    this.axis = "axis" in args.rendering ? args.rendering.axis : false;
    this.contourColorScheme =
        "contourColorScheme" in args.rendering
            ? args.rendering.contourColorScheme
            : "interpolateViridis";
    this.contourOpacity =
        "contourOpacity" in args.rendering ? args.rendering.contourOpacity : 1;
    this.loX = args.x.range != null ? args.x.range[0] : null;
    this.loY = args.y.range != null ? args.y.range[0] : null;
    this.hiX = args.x.range != null ? args.x.range[1] : null;
    this.hiY = args.y.range != null ? args.y.range[1] : null;
}

// get rendering function for an autodd layer based on rendering mode
function getLayerRenderer() {
    function renderCircleBody() {
        var params = args.renderingParams;
        var circleSizeInterpolator = d3
            .scaleLinear()
            .domain([1, REPLACE_ME_maxCircleDigit])
            .range([REPLACE_ME_circleMinSize, REPLACE_ME_circleMaxSize]);
        var g = svg.append("g");
        g.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("r", function(d) {
                return circleSizeInterpolator(d.cluster_num.length);
            })
            .attr("cx", function(d) {
                return d.cx;
            })
            .attr("cy", function(d) {
                return d.cy;
            })
            .style("fill-opacity", 0.25)
            .attr("fill", "honeydew")
            .attr("stroke", "#ADADAD")
            .style("stroke-width", "1px");
        g.selectAll("text")
            .data(data)
            .enter()
            .append("text")
            .attr("dy", "0.3em")
            .text(function(d) {
                return d.cluster_num.toString();
            })
            .attr("font-size", function(d) {
                return circleSizeInterpolator(d.cluster_num.length) / 2;
            })
            .attr("x", function(d) {
                return d.cx;
            })
            .attr("y", function(d) {
                return d.cy;
            })
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .style("fill-opacity", 1)
            .style("fill", "navy")
            .style("pointer-events", "none")
            .each(function(d) {
                params.textwrap(
                    d3.select(this),
                    circleSizeInterpolator(d.cluster_num.length) * 1.5
                );
            });
        var isObjectOnHover = REPLACE_ME_is_object_onhover;
        if (isObjectOnHover) {
            var objectRenderer = REPLACE_ME_this_rendering;
            g.selectAll("circle")
                .on("mouseover", function(d) {
                    objectRenderer(svg, [d], args);
                    svg.selectAll("g:last-of-type")
                        .attr("id", "autodd_tooltip")
                        .style("opacity", 0.8)
                        .style("pointer-events", "none")
                        .selectAll("*")
                        .each(function() {
                            zoomRescale(args.viewId, this);
                        });
                })
                .on("mouseleave", function() {
                    d3.select("#autodd_tooltip").remove();
                });
        }
    }

    function renderObjectClusterNumBody() {
        var g = svg.select("g:last-of-type");
        g.selectAll(".clusternum")
            .data(data)
            .enter()
            .append("text")
            .text(function(d) {
                return d.cluster_num;
            })
            .attr("x", function(d) {
                return +d.cx;
            })
            .attr("y", function(d) {
                return +d.miny;
            })
            .attr("dy", ".35em")
            .attr("font-size", 20)
            .attr("text-anchor", "middle")
            .attr("fill", "#f47142")
            .style("fill-opacity", 1);
    }

    function renderContourBody() {
        var bandwidth = REPLACE_ME_bandwidth;
        var radius = REPLACE_ME_radius;
        var roughN = REPLACE_ME_roughN;
        var decayRate = 2.4;
        var cellSize = 2;
        var contourWidth, contourHeight, x, y;
        if ("tileX" in args) {
            // tiling
            contourWidth = +args.tileW + radius * 2;
            contourHeight = +args.tileH + radius * 2;
            x = +args.tileX;
            y = +args.tileY;
        } else {
            // dynamic boxes
            contourWidth = +args.boxW + radius * 2;
            contourHeight = +args.boxH + radius * 2;
            x = +args.boxX;
            y = +args.boxY;
        }

        var translatedData = data.map(d => ({
            x: d.cx - (x - radius),
            y: d.cy - (y - radius),
            w: +d.cluster_num
        }));
        contours = d3
            .contourDensity()
            .x(d => d.x)
            .y(d => d.y)
            .weight(d => d.w)
            .size([contourWidth, contourHeight])
            .cellSize(cellSize)
            .bandwidth(bandwidth)
            .thresholds(function(v) {
                //                var step = 0.05 / Math.pow(decayRate, +args.pyramidLevel) * 6;
                //                var stop = d3.max(v);
                var eMax =
                    (0.07 * roughN) /
                    1000 /
                    Math.pow(decayRate, +args.pyramidLevel);
                return d3.range(1e-4, eMax, eMax / 6);
            })(translatedData);

        var color = d3
            .scaleSequential(d3["REPLACE_ME_contour_colorScheme"])
            .domain([
                1e-4,
                (0.04 * roughN) /
                    1000 /
                    Math.pow(decayRate, +args.pyramidLevel) /
                    cellSize /
                    cellSize
            ]);

        svg.selectAll("*").remove();
        var g = svg
            .append("g")
            .attr(
                "transform",
                "translate(" + (x - radius) + " " + (y - radius) + ")"
            );

        var isObjectOnHover = REPLACE_ME_is_object_onhover;
        if (isObjectOnHover) {
            g.attr("fill", "none")
                .attr("stroke", "black")
                .attr("stroke-opacity", 0)
                .attr("stroke-linejoin", "round")
                .selectAll("path")
                .data(contours)
                .enter()
                .append("path")
                .attr("d", d3.geoPath())
                .style("fill", d => color(d.value))
                .style("opacity", REPLACE_ME_CONTOUR_OPACITY);
        } else {
            var canvas = document.createElement("canvas");
            var ctx = canvas.getContext("2d");
            (canvas.width = contourWidth), (canvas.height = contourHeight);
            g.append("foreignObject")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", contourWidth)
                .attr("height", contourHeight)
                .style("overflow", "auto")
                .node()
                .appendChild(canvas);
            d3.select(canvas).style("opacity", REPLACE_ME_CONTOUR_OPACITY);
            var path = d3.geoPath().context(ctx);
            for (var i = 0; i < contours.length; i++) {
                var contour = contours[i];
                var threshold = contour.value;
                ctx.beginPath(),
                    (ctx.fillStyle = color(threshold)),
                    path(contour),
                    ctx.fill();
            }
        }
        if (isObjectOnHover) {
            var objectRenderer = REPLACE_ME_this_rendering;
            var hiddenRectSize = 100;
            svg.append("g")
                .selectAll("rect")
                .data(data)
                .enter()
                .append("rect")
                .attr("x", d => d.cx - hiddenRectSize / 2)
                .attr("y", d => d.cy - hiddenRectSize / 2)
                .attr("width", hiddenRectSize)
                .attr("height", hiddenRectSize)
                .attr("fill-opacity", 0)
                .on("mouseover", function(d) {
                    var svgNode;
                    if ("tileX" in args)
                        svgNode = d3.select(svg.node().parentNode);
                    else svgNode = svg;
                    objectRenderer(svgNode, [d], args);
                    var lastG = svgNode.node().childNodes[
                        svgNode.node().childElementCount - 1
                    ];
                    d3.select(lastG)
                        .attr("id", "autodd_tooltip")
                        .style("opacity", 0.8)
                        .style("pointer-events", "none")
                        .selectAll("*")
                        .each(function() {
                            zoomRescale(args.viewId, this);
                        });
                })
                .on("mouseleave", function() {
                    d3.select("#autodd_tooltip").remove();
                });
        }
    }

    var renderFuncBody;
    if (
        this.renderingMode == "object only" ||
        this.renderingMode == "object+clusternum"
    ) {
        renderFuncBody =
            "(" + this.rendering.toString() + ")(svg, data, args);\n";
        if (this.renderingMode == "object+clusternum")
            renderFuncBody += getBodyStringOfFunction(
                renderObjectClusterNumBody
            );
    } else if (
        this.renderingMode == "circle only" ||
        this.renderingMode == "circle+object"
    ) {
        // render circle
        var maxCircleDigit = this.roughN.toString().length;
        renderFuncBody = getBodyStringOfFunction(renderCircleBody)
            .replace(/REPLACE_ME_maxCircleDigit/g, maxCircleDigit)
            .replace(/REPLACE_ME_circleMinSize/g, this.circleMinSize)
            .replace(/REPLACE_ME_circleMaxSize/g, this.circleMaxSize)
            .replace(
                /REPLACE_ME_this_rendering/g,
                this.renderingMode == "circle+object"
                    ? this.rendering.toString()
                    : "null;"
            )
            .replace(
                /REPLACE_ME_is_object_onhover/g,
                this.renderingMode == "circle+object"
            );
    } else if (
        this.renderingMode == "contour only" ||
        this.renderingMode == "contour+object"
    ) {
        renderFuncBody = getBodyStringOfFunction(renderContourBody)
            .replace(/REPLACE_ME_bandwidth/g, this.contourBandwidth)
            .replace(/REPLACE_ME_radius/g, this.bboxH)
            .replace(/REPLACE_ME_roughN/g, this.roughN.toString())
            .replace(/REPLACE_ME_contour_colorScheme/g, this.contourColorScheme)
            .replace(/REPLACE_ME_CONTOUR_OPACITY/g, this.contourOpacity)
            .replace(
                /REPLACE_ME_this_rendering/g,
                this.renderingMode == "contour+object"
                    ? this.rendering.toString()
                    : "null;"
            )
            .replace(
                /REPLACE_ME_is_object_onhover/g,
                this.renderingMode == "contour+object"
            );
    }
    return new Function("svg", "data", "args", renderFuncBody);
}

// get axes renderer
function getAxesRenderer(level) {
    function axesRendererBodyTemplate() {
        var cWidth = args.canvasW,
            cHeight = args.canvasH,
            axes = [];
        var styling = function(axesg) {
            axesg
                .selectAll(".tick line")
                .attr("stroke", "#777")
                .attr("stroke-dasharray", "3,10");
            axesg.style("font", "20px arial");
            axesg.selectAll("path").remove();
        };
        //x
        var x = d3
            .scaleLinear()
            .domain([REPLACE_ME_this_loX, REPLACE_ME_this_hiX])
            .range([REPLACE_ME_xOffset, cWidth - REPLACE_ME_xOffset]);
        var xAxis = d3.axisTop().tickSize(-cHeight);
        axes.push({
            dim: "x",
            scale: x,
            axis: xAxis,
            translate: [0, 0],
            styling: styling
        });
        //y
        var y = d3
            .scaleLinear()
            .domain([REPLACE_ME_this_loY, REPLACE_ME_this_hiY])
            .range([REPLACE_ME_yOffset, cHeight - REPLACE_ME_yOffset]);
        var yAxis = d3.axisLeft().tickSize(-cWidth);
        axes.push({
            dim: "y",
            scale: y,
            axis: yAxis,
            translate: [0, 0],
            styling: styling
        });
        return axes;
    }

    var xOffset = (this.bboxW / 2) * Math.pow(this.zoomFactor, level);
    var yOffset = (this.bboxH / 2) * Math.pow(this.zoomFactor, level);
    var axesFuncBody = getBodyStringOfFunction(axesRendererBodyTemplate);
    axesFuncBody = axesFuncBody
        .replace(/REPLACE_ME_this_loX/g, this.loX)
        .replace(/REPLACE_ME_this_hiX/g, this.hiX)
        .replace(/REPLACE_ME_this_loY/g, this.loY)
        .replace(/REPLACE_ME_this_hiY/g, this.hiY)
        .replace(/REPLACE_ME_xOffset/g, xOffset)
        .replace(/REPLACE_ME_yOffset/g, yOffset);
    return new Function("args", axesFuncBody);
}

//define prototype
AutoDD.prototype = {
    getLayerRenderer,
    getAxesRenderer
};

// exports
module.exports = {
    AutoDD,
    getLayerRenderer,
    getAxesRenderer
};
