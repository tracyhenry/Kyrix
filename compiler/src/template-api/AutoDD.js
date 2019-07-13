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
        "circle only",
        "contour"
    ]);
    if (!allRenderingModes.has(args.renderingMode))
        throw new Error("Constructing AutoDD: unsupported rendering mode.");

    // check constraints according to rendering mode
    this.circleMinSize = 30;
    this.circleMaxSize = 70;
    this.contourBandwidth = 30;
    if (
        args.renderingMode == "circle only" ||
        args.renderingMode == "circle+object"
    ) {
        args.bboxW = args.bboxH = this.circleMaxSize * 2;
        if (!("roughN" in args))
            throw new Error(
                "Constructing AutoDD: A rough estimate of total objects (roughN) is missing for circle rendering modes."
            );
    }
    if (
        (args.renderingMode == "object only" ||
            args.renderingMode == "object+clusternum" ||
            args.renderingMode == "circle+object") &&
        !("rendering" in args)
    )
        throw new Error("Constructing AutoDD: object renderer missing.");
    if (args.renderingMode == "contour") {
        if (!("roughN" in args))
            throw new Error(
                "Constructing AutoDD: A rough estimate of total objects (roughN) is missing for KDE rendering modes."
            );
        args.bboxW = args.bboxH = this.contourBandwidth * 8; // as what's implemented by d3-contour
    }

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
    this.overlap =
        "overlap" in args
            ? args.overlap
                ? true
                : false
            : this.renderingMode == "contour"
            ? true
            : false;
    this.axis = "axis" in args ? args.axis : false;
    this.loX = "loX" in args ? args.loX : null;
    this.loY = "loY" in args ? args.loY : null;
    this.hiX = "hiX" in args ? args.hiX : null;
    this.hiY = "hiY" in args ? args.hiY : null;
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
            .bandwidth(bandwidth)
            .thresholds(function(v) {
                //                var step = 0.05 / Math.pow(decayRate, +args.pyramidLevel) * 6;
                //                var stop = d3.max(v);
                var eMax =
                    (0.25 * roughN) /
                    1000 /
                    Math.pow(decayRate, +args.pyramidLevel);
                return d3.range(1e-4, eMax, eMax / 6);
            })(translatedData);

        const color = d3
            .scaleSequential(d3.interpolateViridis)
            .domain([
                1e-4,
                (0.2 * roughN) /
                    1000 /
                    Math.pow(decayRate, +args.pyramidLevel) /
                    16
            ]);

        svg.selectAll("*").remove();
        var g = svg
            .append("g")
            .attr(
                "transform",
                "translate(" + (x - radius) + " " + (y - radius) + ")"
            );
        g.attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-opacity", 0)
            .attr("stroke-linejoin", "round")
            .selectAll("path")
            .data(contours)
            .enter()
            .append("path")
            .attr("d", d3.geoPath())
            .style("fill", d => color(d.value));
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
    } else if (this.renderingMode == "contour") {
        renderFuncBody = getBodyStringOfFunction(renderContourBody)
            .replace(/REPLACE_ME_bandwidth/g, this.contourBandwidth)
            .replace(/REPLACE_ME_radius/g, this.bboxH)
            .replace(/REPLACE_ME_roughN/g, this.roughN.toString());
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

function getBodyStringOfFunction(func) {
    var funcStr = func.toString();
    const bodyStart = funcStr.indexOf("{") + 1;
    const bodyEnd = funcStr.lastIndexOf("}");
    return "\n" + funcStr.substring(bodyStart, bodyEnd) + "\n";
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
