const getBodyStringOfFunction = require("./Renderers").getBodyStringOfFunction;
const setPropertiesIfNotExists = require("./Renderers")
    .setPropertiesIfNotExists;

/**
 * Constructor of an AutoDD object
 * @param args
 * @constructor
 */
function AutoDD(args) {
    if (args == null) args = {};

    // check clusterMode is correct
    if (
        !("marks" in args) ||
        !"cluster" in args.marks ||
        !("mode" in args.marks.cluster)
    )
        throw new Error(
            "Constructing AutoDD: rendering mode (marks.cluster.mode) missing."
        );
    var allClusterModes = new Set([
        "object",
        "object+clusternum",
        "circle",
        "circle+object",
        "contour",
        "contour+object",
        "heatmap",
        "heatmap+object",
        "radar",
        "radar+object",
        "pie",
        "pie+object"
    ]);
    if (!allClusterModes.has(args.marks.cluster.mode))
        throw new Error("Constructing AutoDD: unsupported rendering mode.");

    // setting cluster params
    this.clusterParams =
        "config" in args.marks.cluster ? args.marks.cluster.config : {};
    if (
        args.marks.cluster.mode == "circle" ||
        args.marks.cluster.mode == "circle+object"
    )
        setPropertiesIfNotExists(this.clusterParams, {
            circleMinSize: 30,
            circleMaxSize: 70
        });
    console.log(this.clusterParams);
    if (
        args.marks.cluster.mode == "contour" ||
        args.marks.cluster.mode == "contour+object"
    )
        setPropertiesIfNotExists(this.clusterParams, {
            contourBandwidth: 30,
            contourColorScheme: "interpolateViridis",
            contourOpacity: 1
        });
    if (
        args.marks.cluster.mode == "heatmap" ||
        args.marks.cluster.mode == "heatmap+object"
    )
        setPropertiesIfNotExists(this.clusterParams, {
            heatmapRadius: 80,
            heatmapOpacity: 1
        });
    if (
        args.marks.cluster.mode == "pie" ||
        args.marks.cluster.mode == "pie+object"
    )
        setPropertiesIfNotExists(this.clusterParams, {
            innerRadius: 1,
            outerRadius: 80,
            cornerRadius: 5,
            padAngle: 0.05
        });

    // check required args
    var requiredArgs = [
        ["data", "query"],
        ["data", "db"],
        ["x", "col"],
        ["x", "range"],
        ["y", "col"],
        ["y", "range"]
    ];
    var requiredArgsTypes = [
        "string",
        "string",
        "string",
        "object",
        "string",
        "object"
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
    if (
        (args.marks.cluster.mode == "object" ||
            args.marks.cluster.mode == "object+clusternum" ||
            args.marks.cluster.mode == "circle+object" ||
            args.marks.cluster.mode == "radar+object" ||
            args.marks.cluster.mode == "contour+object" ||
            args.marks.cluster.mode == "heatmap+object") &&
        (!("obj" in args.marks) || !("renderer" in args.marks.obj))
    )
        throw new Error(
            "Constructing AutoDD: object renderer (rendering.obj.renderer) missing."
        );
    if (args.marks.obj.bboxW <= 0 || args.marks.obj.bboxH <= 0)
        throw new Error("Constructing AutoDD: non-positive bbox size.");
    if (
        args.x.range != null &&
        (!Array.isArray(args.x.range) ||
            args.x.range.length != 2 ||
            typeof args.x.range[0] != "number" ||
            typeof args.x.range[1] != "number")
    )
        throw new Error("Constructing AutoDD: malformed x.range");
    if (
        args.y.range != null &&
        (!Array.isArray(args.y.range) ||
            args.y.range.length != 2 ||
            typeof args.y.range[0] != "number" ||
            typeof args.y.range[1] != "number")
    )
        throw new Error("Constructing AutoDD: malformed y.range");
    if ("axis" in args.marks && (args.x.range == null || args.y.range == null))
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

    // setting bboxes
    if (
        args.marks.cluster.mode == "circle" ||
        args.marks.cluster.mode == "circle+object"
    )
        this.bboxW = this.bboxH = this.clusterParams.circleMaxSize * 2;
    else if (
        args.marks.cluster.mode == "contour" ||
        args.marks.cluster.mode == "contour+object" ||
        args.marks.cluster.mode == "heatmap" ||
        args.marks.cluster.mode == "heatmap+object"
    ) {
        if (args.marks.cluster.mode.indexOf("contour") >= 0)
            // as what's implemented by d3-contour
            this.bboxW = this.bboxH = this.clusterParams.contourBandwidth * 8;
        else this.bboxW = this.bboxH = this.clusterParams.heatmapRadius * 2 + 1;
    } else {
        if (!("bboxW" in args.marks.obj) || !("bboxH" in args.marks.obj))
            throw new Error("Constructing AutoDD: bboxW or bboxH missing");
        this.bboxW = args.marks.obj.bboxW;
        this.bboxH = args.marks.obj.bboxH;
    }

    // assign other fields
    if (!("config" in args)) args.config = {};
    this.upper = "upper" in args ? args.upper : false;
    args.aggregate = "aggregate" in args ? args.aggregate : {attributes: []};
    this.aggMode =
        "mode" in args.aggregate
            ? "mode:" + args.aggregate.mode
            : "mode:number";
    this.query = args.data.query;
    this.db = args.data.db;
    this.xCol = args.x.col;
    this.yCol = args.y.col;
    this.clusterMode = args.marks.cluster.mode;
    this.rendering =
        "renderer" in args.marks.obj ? args.marks.obj.renderer : null;
    this.columnNames = "columnNames" in args.data ? args.data.columnNames : [];
    this.aggColumns =
        "attributes" in args.aggregate
            ? [this.aggMode].concat(args.aggregate.attributes)
            : [this.aggMode];
    this.numLevels = "numLevels" in args.config ? args.config.numLevels : 10;
    this.topLevelWidth =
        "topLevelWidth" in args.config ? args.config.topLevelWidth : 1000;
    this.topLevelHeight =
        "topLevelHeight" in args.config ? args.config.topLevelHeight : 1000;
    this.zoomFactor = "zoomFactor" in args.config ? args.config.zoomFactor : 2;
    this.overlap =
        "overlap" in args.marks.obj
            ? args.marks.obj.overlap
                ? true
                : false
            : this.clusterMode == "contour" ||
              this.clusterMode == "contour+object" ||
              this.clusterMode == "heatmap" ||
              this.clusterMode == "heatmap+object"
            ? true
            : false;
    this.axis = "axis" in args.config ? args.config.axis : false;
    this.loX = args.x.range != null ? args.x.range[0] : null;
    this.loY = args.y.range != null ? args.y.range[0] : null;
    this.hiX = args.x.range != null ? args.x.range[1] : null;
    this.hiY = args.y.range != null ? args.y.range[1] : null;
}

// get rendering function for an autodd layer based on rendering mode
function getLayerRenderer(level, autoDDArrayIndex) {
    function renderCircleBody() {
        var params = args.renderingParams;
        var clusterParams = REPLACE_ME_cluster_params;
        data.forEach(d => {
            d.cluster_agg = JSON.parse(d.cluster_agg);
            d.cluster_num = d.cluster_agg["count"][0].toString();
        });
        var circleSizeInterpolator = d3
            .scaleLinear()
            .domain([1, params.roughN.toString().length - 1])
            .range([clusterParams.circleMinSize, clusterParams.circleMaxSize]);
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
            .style("stroke-width", "1px")
            .classed("kyrix-retainsizezoom", true);
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
            .classed("kyrix-retainsizezoom", true)
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
                        .classed("kyrix-retainsizezoom", true)
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
        data.forEach(d => {
            d.cluster_agg = JSON.parse(d.cluster_agg);
            d.cluster_num = d.cluster_agg["count"][0].toString();
        });
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
            .style("fill-opacity", 1)
            .classed("kyrix-retainsizezoom", true);
    }

    function renderContourBody() {
        var clusterParams = REPLACE_ME_cluster_params;
        var roughN = args.renderingParams.roughN;
        var bandwidth = clusterParams.contourBandwidth;
        var radius = REPLACE_ME_radius;
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
            w: +JSON.parse(d.cluster_agg).count[0]
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
                // var step = 0.05 / Math.pow(decayRate, +args.pyramidLevel) * 6;
                // var stop = d3.max(v);
                var eMax =
                    (0.07 * roughN) /
                    1000 /
                    Math.pow(decayRate, +args.pyramidLevel);
                return d3.range(1e-4, eMax, eMax / 6);
            })(translatedData);

        var color = d3
            .scaleSequential(d3[clusterParams.contourColorScheme])
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
                .style("opacity", clusterParams.contourOpacity);
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
    }

    function renderHeatmapBody() {
        var params = args.renderingParams;
        var clusterParams = REPLACE_ME_cluster_params;
        var radius = clusterParams.heatmapRadius;
        var heatmapWidth, heatmapHeight, x, y;
        if ("tileX" in args) {
            // tiling
            heatmapWidth = +args.tileW + radius * 2;
            heatmapHeight = +args.tileH + radius * 2;
            x = +args.tileX;
            y = +args.tileY;
        } else {
            // dynamic boxes
            heatmapWidth = +args.boxW + radius * 2;
            heatmapHeight = +args.boxH + radius * 2;
            x = +args.boxX;
            y = +args.boxY;
        }

        var translatedData = data.map(d => ({
            x: d.cx - (x - radius),
            y: d.cy - (y - radius),
            w: +JSON.parse(d.cluster_agg).count[0]
        }));

        // render heatmap
        svg.selectAll("*").remove();
        var g = svg
            .append("g")
            .attr(
                "transform",
                "translate(" + (x - radius) + " " + (y - radius) + ")"
            );

        // from heatmap.js
        // https://github.com/pa7/heatmap.js/blob/4e64f5ae5754c84fea363f0fcf24bea4795405ff/src/renderer/canvas2d.js#L23
        var _getPointTemplate = function(radius) {
            var tplCanvas = document.createElement("canvas");
            var tplCtx = tplCanvas.getContext("2d");
            var x = radius;
            var y = radius;
            tplCanvas.width = tplCanvas.height = radius * 2;

            var gradient = tplCtx.createRadialGradient(x, y, 5, x, y, radius);
            gradient.addColorStop(0, "rgba(0,0,0,1)");
            gradient.addColorStop(1, "rgba(0,0,0,0)");
            tplCtx.fillStyle = gradient;
            tplCtx.fillRect(0, 0, 2 * radius, 2 * radius);
            return tplCanvas;
        };

        // draw all data points in black circles
        var alphaCanvas = document.createElement("canvas");
        alphaCanvas.width = heatmapWidth;
        alphaCanvas.height = heatmapHeight;
        var minWeight = params["REPLACE_ME_autoDDId" + "_minWeight"]; // set in the BGRP (back-end generated rendering params)
        var maxWeight = params["REPLACE_ME_autoDDId" + "_maxWeight"]; // set in the BGRP
        var alphaCtx = alphaCanvas.getContext("2d");
        var tpl = _getPointTemplate(radius);
        for (var i = 0; i < translatedData.length; i++) {
            var tplAlpha =
                (translatedData[i].w - minWeight) / (maxWeight - minWeight);
            alphaCtx.globalAlpha = tplAlpha < 0.01 ? 0.01 : tplAlpha;
            alphaCtx.drawImage(
                tpl,
                translatedData[i].x - radius,
                translatedData[i].y - radius
            );
        }

        // colorize the black circles using GPU.js
        var imageData = alphaCtx.getImageData(
            0,
            0,
            heatmapWidth,
            heatmapHeight
        );
        const canvas = document.createElement("canvas");
        canvas.width = heatmapWidth;
        canvas.height = heatmapHeight;
        const gl = canvas.getContext("webgl2", {premultipliedAlpha: false});
        var gpu = new GPU({canvas, webGl: gl});
        const render = gpu
            .createKernel(function(imageData) {
                const alpha =
                    imageData[
                        ((this.constants.height - this.thread.y) *
                            this.constants.width +
                            this.thread.x) *
                            4 +
                            3
                    ];
                const rgb = getColor(alpha / 255.0);
                this.color(
                    rgb[0] / 255.0,
                    rgb[1] / 255.0,
                    rgb[2] / 255.0,
                    alpha / 255.0
                );
            })
            .setOutput([heatmapWidth, heatmapHeight])
            .setGraphical(true)
            .setFunctions([
                function getColor(t) {
                    // equivalent d3 color scale:
                    // d3.scaleLinear()
                    // .domain([0, 0.25, 0.55, 0.85, 1])
                    // .range(["rgb(255,255,255)", "rgb(0,0,255)",
                    // "rgb(0,255,0)", "rgb(255, 255, 0)", "rgb(255,0,0)"]);
                    // hardcode here because we can't access d3 in GPU.js's kernel function
                    if (t >= 0 && t <= 0.25)
                        return [
                            255 + ((0 - 255) * t) / 0.25,
                            255 + ((0 - 255) * t) / 0.25,
                            255
                        ];
                    if (t >= 0.25 && t <= 0.55)
                        return [
                            0,
                            (255 * (t - 0.25)) / 0.3,
                            255 + ((0 - 255) * (t - 0.25)) / 0.3
                        ];
                    if (t >= 0.55 && t <= 0.85)
                        return [(255 * (t - 0.55)) / 0.3, 255, 0];
                    if (t >= 0.85 && t <= 1)
                        return [255, 255 + ((0 - 255) * (t - 0.85)) / 0.15, 0];
                    return [255, 255, 255];
                }
            ])
            .setConstants({width: heatmapWidth, height: heatmapHeight});
        render(imageData.data);

        g.append("foreignObject")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", heatmapWidth)
            .attr("height", heatmapHeight)
            .style("overflow", "auto")
            .node()
            .appendChild(render.canvas);
        d3.select(render.canvas).style("opacity", clusterParams.heatmapOpacity);
    }

    function KDEObjectHoverBody() {
        var isObjectOnHover = REPLACE_ME_is_object_onhover;
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
                        .classed("kyrix-retainsizezoom", true)
                        .each(function() {
                            zoomRescale(args.viewId, this);
                        });
                })
                .on("mouseleave", function() {
                    d3.select("#autodd_tooltip").remove();
                });
        }
    }

    function renderRadarBody() {
        if (!data || data.length == 0) return;
        var params = args.renderingParams;
        var clusterParams = REPLACE_ME_cluster_params;
        var g = svg.append("g");
        var dict = {};

        // Step 1: Pre-compute
        data.forEach(d => {
            d.cluster_agg = JSON.parse(d.cluster_agg);
            d.cluster_num = d.cluster_agg["count"][0].toString();
            d.convexhull = getConvexCoordinates(d);
            for (var key in d.cluster_agg) {
                if (!(key in dict)) {
                    Object.assign(dict, {
                        [key]: {
                            extent: [Number.MAX_VALUE, -Number.MAX_VALUE]
                        }
                    });
                }
                if (key != "count" && key != "convexhull") {
                    d.cluster_agg[key].push(
                        d.cluster_agg[key][0] / d.cluster_agg["count"][0]
                    );
                }
                var avg_index = d.cluster_agg[key].length - 1;
                // if cur avg < min avg
                if (d.cluster_agg[key][avg_index] < dict[key].extent[0])
                    dict[key].extent[0] = d.cluster_agg[key][avg_index];
                if (d.cluster_agg[key][avg_index] > dict[key].extent[1])
                    dict[key].extent[1] = d.cluster_agg[key][avg_index];
            }
        });

        // Step 2: append radars
        var radars = g
            .selectAll("g.radar")
            .data(data)
            .enter();

        // radar chart, for avaerage
        var radius = 0;
        if (typeof clusterParams.size === "number") radius = clusterParams.size;
        else radius = REPLACE_ME_bboxH / 4;

        // radar chart scales
        var rangeRadius = [0, radius];
        // build radius scale
        for (var key in dict) {
            dict[key].scale = d3.scaleLinear().range(rangeRadius);
            if (Array.isArray(clusterParams.domain)) {
                dict[key].scale.domain(clusterParams.domain);
            } else if (typeof clusterParams.domain === "object") {
                dict[key].scale.domain(clusterParams.domain[key]);
            } else if (typeof clusterParams.domain === "number") {
                dict[key].scale.domain([0, clusterParams.domain]);
            } else {
                dict[key].scale.domain(
                    dict[key].extent[0] > 0
                        ? [0, dict[key].extent[1]]
                        : dict[key].extent
                );
            }
        }
        dict.count.scale = d3
            .scaleLinear()
            .range([rangeRadius[1] * 0.6, rangeRadius[1] * 0.5])
            .domain([
                dict.count.extent[0].toString().length,
                dict.count.extent[1].toString().length
            ]);

        // ticks
        var ticks = [];
        if (Array.isArray(clusterParams.ticks)) {
            ticks = clusterParams.ticks;
        } else if (typeof clusterParams.ticks === "number") {
            for (var i = 0; i < clusterParams.ticks; i++)
                ticks.push((i + 1) * (radius / clusterParams.ticks));
        }

        // line
        var line = d3
            .line()
            .x(d => d.x)
            .y(d => d.y);

        function getPathCoordinates(d) {
            var coordinates = [];
            var attributes = Object.keys(d.cluster_agg).filter(
                item => item !== "count" && item !== "convexhull"
            );
            for (var i = 0; i < attributes.length; i++) {
                var attribute = attributes[i];
                var angle = Math.PI / 2 + (2 * Math.PI * i) / attributes.length;
                // average
                coordinates.push(
                    angleToCoordinate(
                        d,
                        angle,
                        attribute,
                        d.cluster_agg[attribute].slice(-1).pop()
                    )
                );
            }
            coordinates.push(coordinates[0]);
            return coordinates;
        }

        function angleToCoordinate(d, angle, key, value, arg) {
            var x = Math.cos(angle) * dict[key].scale(value);
            var y = Math.sin(angle) * dict[key].scale(value);
            return {x: +d.cx + x, y: +d.cy - y};
        }

        radars.each((p, j, nodes) => {
            // ticks
            for (var i = ticks.length - 1; i >= 0; i--) {
                d3.select(nodes[j])
                    .append("circle")
                    .attr("cx", d => d.cx)
                    .attr("cy", d => d.cy)
                    .attr("fill", "none")
                    .attr("stroke", "gray")
                    .attr("r", ticks[i])
                    .classed("kyrix-retainsizezoom", true);
            }
            // axis & axis
            var attributes = Object.keys(p.cluster_agg).filter(
                item => item !== "count" && item !== "convexhull"
            );

            for (var i = 0; i < attributes.length; i++) {
                var attribute = attributes[i];
                var angle = Math.PI / 2 + (2 * Math.PI * i) / attributes.length;
                var max = dict[attribute].scale.domain()[1];
                var line_coordinate = angleToCoordinate(
                    p,
                    angle,
                    attribute,
                    max,
                    "line"
                );
                var label_coordinate = angleToCoordinate(
                    p,
                    angle,
                    attribute,
                    max * 1.1,
                    "label"
                );

                //draw axis line
                d3.select(nodes[j])
                    .append("line")
                    .attr("x1", p.cx)
                    .attr("y1", p.cy)
                    .attr("x2", line_coordinate.x)
                    .attr("y2", line_coordinate.y)
                    .classed("kyrix-retainsizezoom", true)
                    .attr("stroke", "black");

                //draw axis label
                d3.select(nodes[j])
                    .append("text")
                    .classed("label", true)
                    .attr("x", label_coordinate.x)
                    .attr("y", label_coordinate.y)
                    .classed("kyrix-retainsizezoom", true)
                    .text(attribute.substr(0, 3).toUpperCase());
            }
            // path
            var coordinates = getPathCoordinates(p);
            d3.select(nodes[j])
                .append("path")
                .datum(coordinates)
                .attr("d", line)
                .classed("radar", true)
                .attr("stroke-width", 3)
                .attr("stroke", "darkorange")
                .attr("fill", "darkorange")
                .attr("stroke-opacity", 0.8)
                .attr("fill-opacity", 0.5)
                .classed("kyrix-retainsizezoom", true)
                .datum(p);

            d3.select(nodes[j])
                .append("text")
                .text(function(d) {
                    return d.cluster_num.toString();
                })
                .attr("font-size", function(d) {
                    return dict.count.scale(d.cluster_num.length) / 2;
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
                .classed("kyrix-retainsizezoom", true)
                .each(function(d) {
                    params.textwrap(
                        d3.select(this),
                        dict.count.scale(d.cluster_num.length) * 1.5
                    );
                });
        });

        function getConvexCoordinates(d) {
            var coords = d.cluster_agg.convexhull;
            var size = coords.length / 2;
            var convexhull = [];
            for (var i = 0; i < size; i++) {
                convexhull.push({
                    x: coords[i * 2],
                    y: coords[i * 2 + 1]
                });
            }
            d.convexhull = convexhull;
            return convexhull;
        }

        function showConvex(svg, d) {
            var g = svg.append("g");
            g.append("path")
                .datum(d)
                .attr("class", d => `convexhull`)
                .attr("id", "convexhull")
                .attr("d", d => line(d.convexhull))
                .style("fill-opacity", 0)
                .style("stroke-width", 3)
                .style("stroke-opacity", 0.5)
                .style("stroke", "grey")
                .style("pointer-events", "none");
        }

        var isObjectOnHover = REPLACE_ME_is_object_onhover;
        if (isObjectOnHover) {
            var objectRenderer = REPLACE_ME_this_rendering;
            g.selectAll("path.radar")
                .on("mouseover", function(d, i, nodes) {
                    showConvex(svg, d);
                    objectRenderer(svg, [d], args);
                    svg.selectAll("g:last-of-type")
                        .attr("id", "autodd_tooltip")
                        .style("opacity", 1)
                        .style("pointer-events", "none")
                        .selectAll("*")
                        .classed("kyrix-retainsizezoom", true)
                        .each(function() {
                            zoomRescale(args.viewId, this);
                        });
                })
                .on("mouseleave", function() {
                    d3.selectAll("#autodd_tooltip").remove();
                    d3.selectAll("#convexhull").remove();
                });
        }
    }

    function renderPieBody() {
        // step 0: import
        /**
         * expected argument lengths
         * @type {Object}
         */

        var length = {
            a: 7,
            c: 6,
            h: 1,
            l: 2,
            m: 2,
            q: 4,
            s: 4,
            t: 2,
            v: 1,
            z: 0
        };

        /**
         * segment pattern
         * @type {RegExp}
         */

        var segment = /([astvzqmhlc])([^astvzqmhlc]*)/gi;

        /**
         * parse an svg path data string. Generates an Array
         * of commands where each command is an Array of the
         * form `[command, arg1, arg2, ...]`
         *
         * @param {String} path
         * @return {Array}
         */

        function parse(path) {
            var data = [];
            path.replace(segment, function(_, command, args) {
                var type = command.toLowerCase();
                args = parseValues(args);

                // overloaded moveTo
                if (type == "m" && args.length > 2) {
                    data.push([command].concat(args.splice(0, 2)));
                    type = "l";
                    command = command == "m" ? "l" : "L";
                }

                while (true) {
                    if (args.length == length[type]) {
                        args.unshift(command);
                        return data.push(args);
                    }
                    if (args.length < length[type])
                        throw new Error("malformed path data");
                    data.push([command].concat(args.splice(0, length[type])));
                }
            });
            return data;
        }

        var number = /-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/gi;

        function parseValues(args) {
            var numbers = args.match(number);
            return numbers ? numbers.map(Number) : [];
        }

        function translate(segments, x, y) {
            // y is optional
            y = y || 0;

            return segments.map(function(segment) {
                var cmd = segment[0];

                // Shift coords only for commands with absolute values
                if ("ACHLMRQSTVZ".indexOf(cmd) === -1) {
                    return segment;
                }

                var name = cmd.toLowerCase();

                // V is the only command, with shifted coords parity
                if (name === "v") {
                    segment[1] = Number(segment[1]) + +y;
                    return segment;
                }

                // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
                // touch x, y only
                if (name === "a") {
                    segment[6] = Number(segment[6]) + +x;
                    segment[7] = Number(segment[7]) + +y;
                    return segment;
                }

                // All other commands have [cmd, x1, y1, x2, y2, x3, y3, ...] format
                return segment.map(function(val, i) {
                    if (!i) {
                        return val;
                    }
                    return i % 2 ? Number(val) + +x : Number(val) + +y;
                });
            });
        }

        function serialize(path) {
            return path.reduce(function(str, seg) {
                return str + seg[0] + seg.slice(1).join(",");
            }, "");
        }

        if (!data || data.length == 0) return;
        var params = args.renderingParams;
        var clusterParams = REPLACE_ME_cluster_params;
        var g = svg.append("g");

        var dict = {};

        function filter(key) {
            return key !== "count" && key !== "convexhull";
        }

        function getConvexCoordinates(d) {
            var coords = d.cluster_agg.convexhull;
            var size = coords.length / 2;
            var convexhull = [];
            for (var i = 0; i < size; i++) {
                convexhull.push({
                    x: coords[i * 2],
                    y: coords[i * 2 + 1]
                });
            }
            return convexhull;
        }

        // Step 1: Pre-compute
        data.forEach(d => {
            d.cluster_agg = JSON.parse(d.cluster_agg);
            d.cluster_num = d.cluster_agg["count"][0].toString();
            d.convexhull = getConvexCoordinates(d);
            for (var key in d.cluster_agg) {
                if (!(key in dict)) {
                    Object.assign(dict, {
                        [key]: {
                            extent: [Number.MAX_VALUE, -Number.MAX_VALUE]
                        }
                    });
                }
                if (filter(key)) {
                    d.cluster_agg[key].push(
                        d.cluster_agg[key][0] / d.cluster_agg["count"][0]
                    );
                }
                var avg_index = d.cluster_agg[key].length - 1;
                // if cur avg < min avg
                if (d.cluster_agg[key][avg_index] < dict[key].extent[0])
                    dict[key].extent[0] = d.cluster_agg[key][avg_index];
                if (d.cluster_agg[key][avg_index] > dict[key].extent[1])
                    dict[key].extent[1] = d.cluster_agg[key][avg_index];
            }
        });

        // Step 2: append pies
        var domain = clusterParams.domain;
        var pie = d3
            .pie()
            .value(function(d) {
                return d.value[0];
            })
            .sort(function(a, b) {
                return domain.indexOf(a.key) - domain.indexOf(b.key);
            });
        var line = d3
            .line()
            .x(d => d.x)
            .y(d => d.y);

        var color = d3.scaleOrdinal(d3.schemeTableau10).domain(domain);
        var arc = d3
            .arc()
            .innerRadius(clusterParams.innerRadius)
            .outerRadius(clusterParams.outerRadius)
            .cornerRadius(clusterParams.cornerRadius)
            .padAngle(clusterParams.padAngle);
        var scalePercent = d3
            .scaleLinear()
            .domain([0, 2 * Math.PI])
            .range([0, 1]);
        var formatter = d3.format(".1%");
        var pos = ["cx", "cy", "minx", "miny", "maxx", "maxy"];
        var slicedata = [];

        data.forEach((p, j) => {
            p.arcs = pie(
                d3
                    .entries(p.cluster_agg)
                    .filter(d => filter(d.key))
                    .sort((x, y) => d3.ascending(x.key, y.key))
            );
            var cooked = p.arcs.map(entry => {
                // for (var index in pos) entry[pos[index]] = +p[pos[index]];
                for (var key in p) {
                    entry[key] = p[key];
                }
                entry.data.percentage = formatter(
                    scalePercent(entry.endAngle - entry.startAngle)
                );
                entry.convexhull = p.convexhull;
                return entry;
            });
            slicedata = slicedata.concat(cooked);
        });

        var slices = g
            .selectAll("path.slice")
            .data(slicedata)
            .enter()
            .append("path")
            .attr("class", function(d, i) {
                return `value ${d.data.key} kyrix-retainsizezoom`;
            })
            .attr("d", (d, i, nodes) => {
                return serialize(translate(parse(arc(d)), d.cx, d.cy));
            })
            .attr("fill", function(d, i) {
                var ret = color(d.data.key);
                return ret;
            });

        var numbers = g
            .selectAll("text.cluster_num")
            .data(data)
            .enter()
            .append("text")
            .classed("cluster_num", true)
            .text(d => d.cluster_num)
            .attr("x", d => +d.cx)
            .attr("y", d => +d.cy - clusterParams.outerRadius)
            // .attr("dy", ".35em")
            .attr("font-size", clusterParams.outerRadius / 2.5)
            .attr("text-anchor", "middle")
            .style("fill-opacity", 0.8)
            .style("fill", "grey")
            .style("pointer-events", "none")
            .classed("kyrix-retainsizezoom", true);

        function showConvex(svg, d) {
            var g = svg.append("g");
            g.append("path")
                .datum(d)
                .attr("class", d => `convexhull ${d.name}`)
                .attr("id", "convexhull")
                .attr("d", d => line(d.convexhull))
                .style("fill-opacity", 0)
                .style("stroke-width", 3)
                .style("stroke-opacity", 0.5)
                .style("stroke", "grey")
                .style("pointer-events", "none");
        }

        var isObjectOnHover = REPLACE_ME_is_object_onhover;
        if (isObjectOnHover) {
            var objectRenderer = REPLACE_ME_this_rendering;
            g.selectAll("path.value")
                .on("mouseover", function(d, i, nodes) {
                    showConvex(svg, d);
                    objectRenderer(svg, [d], args);
                    svg.selectAll("g:last-of-type")
                        .attr("id", "autodd_tooltip")
                        .style("opacity", 1)
                        .style("pointer-events", "none")
                        .selectAll("*")
                        .classed("kyrix-retainsizezoom", true)
                        .each(function() {
                            zoomRescale(args.viewId, this);
                        });
                })
                .on("mouseleave", function() {
                    d3.selectAll("#autodd_tooltip").remove();
                    d3.selectAll("#convexhull").remove();
                });
        }
    }

    var renderFuncBody;
    if (
        this.clusterMode == "object" ||
        this.clusterMode == "object+clusternum"
    ) {
        renderFuncBody =
            "(" + this.rendering.toString() + ")(svg, data, args);\n";
        if (this.clusterMode == "object+clusternum")
            renderFuncBody += getBodyStringOfFunction(
                renderObjectClusterNumBody
            );
    } else if (
        this.clusterMode == "circle" ||
        this.clusterMode == "circle+object"
    ) {
        // render circle
        renderFuncBody = getBodyStringOfFunction(renderCircleBody)
            .replace(
                /REPLACE_ME_cluster_params/g,
                JSON.stringify(this.clusterParams)
            )
            .replace(
                /REPLACE_ME_this_rendering/g,
                this.clusterMode == "circle+object"
                    ? this.rendering.toString()
                    : "null;"
            )
            .replace(
                /REPLACE_ME_is_object_onhover/g,
                this.clusterMode == "circle+object"
            );
    } else if (
        this.clusterMode == "contour" ||
        this.clusterMode == "contour+object"
    ) {
        renderFuncBody = getBodyStringOfFunction(renderContourBody)
            .replace(
                /REPLACE_ME_cluster_params/g,
                JSON.stringify(this.clusterParams)
            )
            .replace(/REPLACE_ME_radius/g, this.bboxH)
            .replace(
                /REPLACE_ME_is_object_onhover/g,
                this.clusterMode == "contour+object"
            );
        if (this.clusterMode == "contour+object")
            renderFuncBody += getBodyStringOfFunction(KDEObjectHoverBody)
                .replace(
                    /REPLACE_ME_is_object_onhover/g,
                    this.clusterMode == "contour+object"
                )
                .replace(
                    /REPLACE_ME_this_rendering/g,
                    this.rendering.toString()
                );
    } else if (
        this.clusterMode == "radar" ||
        this.clusterMode == "radar+object"
    ) {
        renderFuncBody = getBodyStringOfFunction(renderRadarBody)
            .replace(
                /REPLACE_ME_cluster_params/g,
                JSON.stringify(this.clusterParams)
            )
            .replace(/REPLACE_ME_bboxH/g, this.bboxH)
            .replace(
                /REPLACE_ME_is_object_onhover/g,
                this.clusterMode == "radar+object"
            )
            .replace(
                /REPLACE_ME_this_rendering/g,
                this.clusterMode == "radar+object"
                    ? this.rendering.toString()
                    : "null;"
            );
    } else if (this.clusterMode == "pie" || this.clusterMode == "pie+object") {
        renderFuncBody = getBodyStringOfFunction(renderPieBody)
            .replace(
                /REPLACE_ME_cluster_params/g,
                JSON.stringify(this.clusterParams)
            )
            .replace(/REPLACE_ME_bboxH/g, this.bboxH)
            .replace(
                /REPLACE_ME_is_object_onhover/g,
                this.clusterMode == "pie+object"
            )
            .replace(
                /REPLACE_ME_this_rendering/g,
                this.clusterMode == "pie+object"
                    ? this.rendering.toString()
                    : "null;"
            );
    } else if (
        this.clusterMode == "heatmap" ||
        this.clusterMode == "heatmap+object"
    ) {
        renderFuncBody = getBodyStringOfFunction(renderHeatmapBody)
            .replace(
                /REPLACE_ME_cluster_params/g,
                JSON.stringify(this.clusterParams)
            )
            .replace(/REPLACE_ME_autoDDId/g, autoDDArrayIndex + "_" + level);
        if (this.clusterMode == "heatmap+object")
            renderFuncBody += getBodyStringOfFunction(KDEObjectHoverBody)
                .replace(
                    /REPLACE_ME_is_object_onhover/g,
                    this.clusterMode == "heatmap+object"
                )
                .replace(
                    /REPLACE_ME_this_rendering/g,
                    this.rendering.toString()
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
        var xAxis = d3.axisBottom().tickSize(-cHeight);
        axes.push({
            dim: "x",
            scale: x,
            axis: xAxis,
            translate: [0, args.viewportH],
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

function getStaticUpperRenderer(level) {
    function legendRenderer() {
        svg.append("g")
            .attr("class", "legendOrdinal")
            .attr("transform", "translate(50,50)scale(2.0)");
        // g.selectAll("path.convex")
        //     .data(data)
        //     .enter()
        //     .append("path")

        var clusterParams = REPLACE_ME_cluster_params;
        var domain = clusterParams.domain;

        var color = d3.scaleOrdinal(d3.schemeTableau10).domain(domain);

        var legendOrdinal = d3
            .legendColor()
            //d3 symbol creates a path-string, for example
            //"M0,-8.059274488676564L9.306048591020996,
            //8.059274488676564 -9.306048591020996,8.059274488676564Z"
            // .shape("path", d3.symbol().type(d3.symbolDiamond).size(150)())
            .shape("rect")
            .shapePadding(10)
            .title("Age Groups of Soccer Players in FIFA 19")
            .labelOffset(15)
            // .labelAlign("start")
            .scale(color);

        svg.select(".legendOrdinal").call(legendOrdinal);
    }

    if (this.aggMode == "mode:category") {
        renderFuncBody = getBodyStringOfFunction(legendRenderer).replace(
            /REPLACE_ME_cluster_params/g,
            JSON.stringify(this.clusterParams)
        );
    }
    return new Function("svg", "data", "args", renderFuncBody);
}

//define prototype
AutoDD.prototype = {
    getLayerRenderer,
    getAxesRenderer,
    getStaticUpperRenderer
};

// exports
module.exports = {
    AutoDD
};
