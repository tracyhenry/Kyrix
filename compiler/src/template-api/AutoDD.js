const getBodyStringOfFunction = require("./Utilities").getBodyStringOfFunction;
const setPropertiesIfNotExists = require("./Utilities")
    .setPropertiesIfNotExists;
const parsePathIntoSegments = require("./Utilities").parsePathIntoSegments;
const translatePathSegments = require("./Utilities").translatePathSegments;
const serializePath = require("./Utilities").serializePath;

/**
 * Constructor of an AutoDD object
 * @param args
 * @constructor
 */
function AutoDD(args) {
    if (args == null) args = {};

    /******************************
     * check clusterMode is correct
     ******************************/
    if (
        !("marks" in args) ||
        !"cluster" in args.marks ||
        !("mode" in args.marks.cluster)
    )
        throw new Error(
            "Constructing AutoDD: cluster mode (marks.cluster.mode) missing."
        );
    var allClusterModes = new Set([
        "object",
        "circle",
        "contour",
        "heatmap",
        "radar",
        "pie"
    ]);
    if (!allClusterModes.has(args.marks.cluster.mode))
        throw new Error("Constructing AutoDD: unsupported cluster mode.");

    /**************************************************************
     * augment args with optional stuff that is omitted in the spec
     **************************************************************/

    if (!("config" in args)) args.config = {};
    if (!("hover" in args.marks)) args.marks.hover = {};
    if (!("legend" in args)) args.legend = {};
    if (!("aggregate" in args)) args.aggregate = {attributes: []};

    /*********************
     * check required args
     *********************/
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

    /*******************
     * other constraints
     *******************/
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
    if (
        args.marks.cluster.mode == "object" &&
        !("object" in args.marks.cluster)
    )
        throw new Error(
            "Constructing AutoDD: object renderer (marks.cluster.object) missing."
        );
    if (
        "object" in args.marks.hover &&
        typeof args.marks.hover.object != "function"
    )
        throw new Error(
            "Constructing AutoDD: hover object renderer (marks.cluster.hover.object) is not a function."
        );

    /************************
     * setting cluster params
     ************************/
    this.clusterParams =
        "config" in args.marks.cluster ? args.marks.cluster.config : {};
    if (args.marks.cluster.mode == "circle")
        setPropertiesIfNotExists(this.clusterParams, {
            circleMinSize: 30,
            circleMaxSize: 70
        });
    if (args.marks.cluster.mode == "contour")
        setPropertiesIfNotExists(this.clusterParams, {
            contourBandwidth: 30,
            contourColorScheme: "interpolateViridis",
            contourOpacity: 1
        });
    if (args.marks.cluster.mode == "heatmap")
        setPropertiesIfNotExists(this.clusterParams, {
            heatmapRadius: 80,
            heatmapOpacity: 1
        });
    if (args.marks.cluster.mode == "radar")
        setPropertiesIfNotExists(this.clusterParams, {
            radius: 80,
            ticks: 5
        });
    if (args.marks.cluster.mode == "pie")
        setPropertiesIfNotExists(this.clusterParams, {
            innerRadius: 1,
            outerRadius: 80,
            cornerRadius: 5,
            padAngle: 0.05
        });

    /***************************
     * setting legend parameters
     ***************************/
    this.legendParams = {};
    // TODO: add legend params for other templates
    if (args.marks.cluster.mode == "pie") {
        if ("title" in args.legend)
            this.legendParams.legendTitle = args.legend.title;
        if ("domain" in args.legend)
            this.legendParams.legendDomain = args.legend.domain;
        setPropertiesIfNotExists(this.legendParams, {
            legendTitle: "Legend",
            legendDomain: this.clusterParams.domain
        });
    }

    /****************
     * setting bboxes
     ****************/
    if (args.marks.cluster.mode == "object") {
        if (
            !("bboxW" in args.marks.cluster.config) ||
            !("bboxH" in args.marks.cluster.config)
        )
            throw new Error("Constructing AutoDD: bboxW or bboxH missing");
        this.bboxW = args.marks.cluster.config.bboxW;
        this.bboxH = args.marks.cluster.config.bboxH;
    } else if (args.marks.cluster.mode == "circle")
        this.bboxW = this.bboxH = this.clusterParams.circleMaxSize * 2;
    else if (args.marks.cluster.mode == "contour")
        this.bboxW = this.bboxH = this.clusterParams.contourBandwidth * 8;
    else if (args.marks.cluster.mode == "heatmap")
        this.bboxW = this.bboxH = this.clusterParams.heatmapRadius * 2 + 1;
    else if (args.marks.cluster.mode == "radar")
        // tuned by hand :)
        this.bboxW = this.bboxH = 290;
    else if (args.marks.cluster.mode == "pie") this.bboxW = this.bboxH = 290; // tuned by hand :)

    // assign other fields
    this.hover = args.marks.hover;
    setPropertiesIfNotExists(this.hover, {convex: false, object: null});
    this.isHover = this.hover.object != null || this.hover.convex;
    this.aggMode =
        "mode" in args.aggregate
            ? "mode:" + args.aggregate.mode
            : "mode:number";
    this.aggColumns = [this.aggMode].concat(args.aggregate.attributes);
    this.query = args.data.query;
    this.db = args.data.db;
    this.xCol = args.x.col;
    this.yCol = args.y.col;
    this.clusterMode = args.marks.cluster.mode;
    this.rendering =
        "object" in args.marks.cluster ? args.marks.cluster.object : null;
    this.columnNames = "columnNames" in args.data ? args.data.columnNames : [];
    this.numLevels = "numLevels" in args.config ? args.config.numLevels : 10;
    this.topLevelWidth =
        "topLevelWidth" in args.config ? args.config.topLevelWidth : 1000;
    this.topLevelHeight =
        "topLevelHeight" in args.config ? args.config.topLevelHeight : 1000;
    this.zoomFactor = "zoomFactor" in args.config ? args.config.zoomFactor : 2;
    this.overlap =
        "overlap" in this.clusterParams
            ? this.clusterParams.overlap
                ? true
                : false
            : this.clusterMode == "contour" || this.clusterMode == "heatmap"
            ? true
            : false;
    this.axis = "axis" in args.config ? args.config.axis : false;
    this.loX = args.x.range != null ? args.x.range[0] : null;
    this.loY = args.y.range != null ? args.y.range[0] : null;
    this.hiX = args.x.range != null ? args.x.range[1] : null;
    this.hiY = args.y.range != null ? args.y.range[1] : null;
}

// get rendering function for an autodd layer based on cluster mode
function getLayerRenderer(level, autoDDArrayIndex) {
    function renderCircleBody() {
        var params = args.renderingParams;
        var processClusterAgg = REPLACE_ME_processClusterAgg;
        processClusterAgg(data);
        var circleSizeInterpolator = d3
            .scaleLinear()
            .domain([1, params.roughN.toString().length - 1])
            .range([params.circleMinSize, params.circleMaxSize]);
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

        // for hover
        var hoverSelector = "circle";
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
        var params = args.renderingParams;
        var roughN = params.roughN;
        var bandwidth = params.contourBandwidth;
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
            .scaleSequential(d3[params.contourColorScheme])
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

        var isHover = REPLACE_ME_is_hover;
        if (isHover) {
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
                .style("opacity", params.contourOpacity);
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
        var radius = params.heatmapRadius;
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
        d3.select(render.canvas).style("opacity", params.heatmapOpacity);
    }

    function renderRadarBody() {
        if (!data || data.length == 0) return;
        var params = args.renderingParams;
        var g = svg.append("g");
        var dict = {};

        // Step 1: Pre-process clusterAgg
        var processClusterAgg = REPLACE_ME_processClusterAgg;
        processClusterAgg(data, dict);

        // Step 2: append radars
        var radars = g
            .selectAll("g.radar")
            .data(data)
            .enter();

        // radar chart, for average
        var radius = params.radius;

        // build radius scale
        for (var key in dict)
            dict[key].scale = d3
                .scaleLinear()
                .domain([0, params.domain])
                .range([0, radius]);

        // ticks
        var ticks = [];
        for (var i = 0; i < params.ticks; i++)
            ticks.push((i + 1) * (radius / params.ticks));

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
                .attr("font-size", 25)
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
                .classed("kyrix-retainsizezoom", true);
        });

        // for hover
        var hoverSelector = "path.radar";
    }

    function renderPieBody() {
        if (!data || data.length == 0) return;
        var params = args.renderingParams;
        var parse = REPLACE_ME_parse_func;
        var translate = REPLACE_ME_translate_func;
        var serialize = REPLACE_ME_serialize_func;

        var g = svg.append("g");

        // Step 1: Pre-process clusterAgg
        var processClusterAgg = REPLACE_ME_processClusterAgg;
        processClusterAgg(data);

        // Step 2: append pies
        var domain = params.domain;
        var pie = d3
            .pie()
            .value(function(d) {
                return d.value[0];
            })
            .sort(function(a, b) {
                return domain.indexOf(a.key) - domain.indexOf(b.key);
            });
        var color = d3.scaleOrdinal(d3.schemeTableau10).domain(domain);
        var arc = d3
            .arc()
            .innerRadius(params.innerRadius)
            .outerRadius(params.outerRadius)
            .cornerRadius(params.cornerRadius)
            .padAngle(params.padAngle);
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
                    .filter(d => d.key !== "count" && d.key !== "convexhull")
                    .sort((x, y) => d3.ascending(x.key, y.key))
            );
            var cooked = p.arcs.map(entry => {
                // for (var index in pos) entry[pos[index]] = +p[pos[index]];
                for (var key in p) entry[key] = p[key];
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
            .attr("y", d => +d.cy - params.outerRadius)
            // .attr("dy", ".35em")
            .attr("font-size", params.outerRadius / 2.5)
            .attr("text-anchor", "middle")
            .style("fill-opacity", 0.8)
            .style("fill", "grey")
            .style("pointer-events", "none")
            .classed("kyrix-retainsizezoom", true);

        // for hover
        var hoverSelector = "path.value";
    }

    function processClusterAgg(data) {
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

        data.forEach(d => {
            d.cluster_agg = JSON.parse(d.cluster_agg);
            d.cluster_num = d.cluster_agg["count"][0].toString();
            d.convexhull = getConvexCoordinates(d);
            for (var key in d.cluster_agg) {
                if (key != "count" && key != "convexhull") {
                    d.cluster_agg[key].push(
                        d.cluster_agg[key][0] / d.cluster_agg["count"][0]
                    );
                }
            }
        });
    }

    function regularHoverBody() {
        function showConvex(svg, d) {
            var line = d3
                .line()
                .x(d => d.x)
                .y(d => d.y);
            var g = svg.append("g");
            g.append("path")
                .datum(d)
                .attr("class", d => `convexhull`)
                .attr("id", "autodd_convexhull")
                .attr("d", d => line(d.convexhull))
                .style("fill-opacity", 0)
                .style("stroke-width", 3)
                .style("stroke-opacity", 0.5)
                .style("stroke", "grey")
                .style("pointer-events", "none");
        }
        var objectRenderer = REPLACE_ME_this_rendering;
        g.selectAll(hoverSelector)
            .on("mouseover", function(d) {
                if (REPLACE_ME_show_convex) showConvex(svg, d);
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
                d3.selectAll("#autodd_tooltip").remove();
                d3.selectAll("#autodd_convexhull").remove();
            });
    }

    function KDEObjectHoverBody() {
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
                if ("tileX" in args) svgNode = d3.select(svg.node().parentNode);
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

    var renderFuncBody;
    if (this.clusterMode == "object") {
        renderFuncBody =
            "(" + this.rendering.toString() + ")(svg, data, args);\n";
        if (this.clusterParams.clusterCount)
            renderFuncBody += getBodyStringOfFunction(
                renderObjectClusterNumBody
            );
    } else if (this.clusterMode == "circle") {
        // render circle
        renderFuncBody = getBodyStringOfFunction(renderCircleBody)
            .replace(
                /REPLACE_ME_this_rendering/g,
                this.hover.object != null
                    ? this.hover.object.toString()
                    : "null;"
            )
            .replace(
                /REPLACE_ME_processClusterAgg/g,
                processClusterAgg.toString()
            );
        if (this.isHover)
            renderFuncBody += getBodyStringOfFunction(regularHoverBody)
                .replace(
                    /REPLACE_ME_this_rendering/g,
                    this.hover.object.toString()
                )
                .replace(/REPLACE_ME_show_convex/g, this.hover.convex);
    } else if (this.clusterMode == "contour") {
        renderFuncBody = getBodyStringOfFunction(renderContourBody)
            .replace(/REPLACE_ME_radius/g, this.bboxH)
            .replace(/REPLACE_ME_is_hover/g, this.isHover);
        if (this.isHover)
            renderFuncBody += getBodyStringOfFunction(
                KDEObjectHoverBody
            ).replace(
                /REPLACE_ME_this_rendering/g,
                this.hover.object.toString()
            );
    } else if (this.clusterMode == "heatmap") {
        renderFuncBody = getBodyStringOfFunction(renderHeatmapBody).replace(
            /REPLACE_ME_autoDDId/g,
            autoDDArrayIndex + "_" + level
        );
        if (this.isHover)
            renderFuncBody += getBodyStringOfFunction(
                KDEObjectHoverBody
            ).replace(
                /REPLACE_ME_this_rendering/g,
                this.hover.object.toString()
            );
    } else if (this.clusterMode == "radar") {
        renderFuncBody = getBodyStringOfFunction(renderRadarBody)
            .replace(
                /REPLACE_ME_this_rendering/g,
                this.hover.object ? this.hover.object.toString() : "null;"
            )
            .replace(
                /REPLACE_ME_processClusterAgg/g,
                processClusterAgg.toString()
            );
        if (this.isHover)
            renderFuncBody += getBodyStringOfFunction(regularHoverBody)
                .replace(
                    /REPLACE_ME_this_rendering/g,
                    this.hover.object.toString()
                )
                .replace(/REPLACE_ME_show_convex/g, this.hover.convex);
    } else if (this.clusterMode == "pie") {
        renderFuncBody = getBodyStringOfFunction(renderPieBody)
            .replace(
                /REPLACE_ME_this_rendering/g,
                this.hover.object ? this.hover.object.toString() : "null;"
            )
            .replace(
                /REPLACE_ME_processClusterAgg/g,
                processClusterAgg.toString()
            )
            .replace(/REPLACE_ME_parse_func/g, parsePathIntoSegments.toString())
            .replace(
                /REPLACE_ME_translate_func/g,
                translatePathSegments.toString()
            )
            .replace(/REPLACE_ME_serialize_func/g, serializePath.toString());
        if (this.isHover)
            renderFuncBody += getBodyStringOfFunction(regularHoverBody)
                .replace(
                    /REPLACE_ME_this_rendering/g,
                    this.hover.object.toString()
                )
                .replace(/REPLACE_ME_show_convex/g, this.hover.convex);
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

function getLegendRenderer() {
    function pieLegendRendererBody() {
        svg.append("g")
            .attr("class", "legendOrdinal")
            .attr("transform", "translate(50,50) scale(2.0)");

        var params = args.renderingParams;
        var color = d3
            .scaleOrdinal(d3.schemeTableau10)
            .domain(params.legendDomain);
        var legendOrdinal = d3
            .legendColor()
            //d3 symbol creates a path-string, for example
            //"M0,-8.059274488676564L9.306048591020996,
            //8.059274488676564 -9.306048591020996,8.059274488676564Z"
            // .shape("path", d3.symbol().type(d3.symbolDiamond).size(150)())
            .shape("rect")
            .shapePadding(10)
            .title(params.legendTitle)
            .labelOffset(15)
            // .labelAlign("start")
            .scale(color);

        svg.select(".legendOrdinal").call(legendOrdinal);
    }

    var renderFuncBody = "";
    if (this.clusterMode == "pie") {
        renderFuncBody = getBodyStringOfFunction(pieLegendRendererBody).replace(
            /REPLACE_ME_legend_params/g,
            JSON.stringify(this.legendParams)
        );
    }
    // TODO: add legend for other templates
    return new Function("svg", "data", "args", renderFuncBody);
}

//define prototype
AutoDD.prototype = {
    getLayerRenderer,
    getAxesRenderer,
    getLegendRenderer
};

// exports
module.exports = {
    AutoDD
};
