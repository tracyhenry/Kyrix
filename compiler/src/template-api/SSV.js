const getBodyStringOfFunction = require("./Utilities").getBodyStringOfFunction;
const formatAjvErrorMessage = require("./Utilities").formatAjvErrorMessage;
const fs = require("fs");
const cloneDeep = require("lodash.clonedeep");

/**
 * Constructor of an SSV object
 * @param args
 * @constructor
 */
function SSV(args_) {
    // verify against schema
    // defaults are assigned at the same time
    var args = cloneDeep(args_);
    var schema = JSON.parse(
        fs.readFileSync("../../src/template-api/json-schema/SSV.json")
    );
    var ajv = new require("ajv")({useDefaults: true});
    ajv.addKeyword("typeofFunction", {
        compile: () => data => data instanceof Function
    });
    var validator = ajv.compile(schema);
    var valid = validator(args);
    if (!valid)
        throw new Error(
            "Constructing SSV: " + formatAjvErrorMessage(validator.errors[0])
        );

    /*******************************************************************************
     * check constraints/add defaults that can't be easily expressed by json-schema
     *******************************************************************************/
    // no limit in the query
    if (args.data.query.toLowerCase().includes("limit"))
        throw new Error("Constructing SSV: LIMIT is not allowed in data.query");

    // succinct object notation of the measures
    if (!("length" in args.marks.cluster.aggregate.measures)) {
        var measureArray = [];
        for (
            var i = 0;
            i < args.marks.cluster.aggregate.measures.fields.length;
            i++
        )
            measureArray.push({
                field: args.marks.cluster.aggregate.measures.fields[i],
                function: args.marks.cluster.aggregate.measures.function,
                extent:
                    "extent" in args.marks.cluster.aggregate.measures
                        ? args.marks.cluster.aggregate.measures.extent
                        : [Number.MIN_VALUE, Number.MAX_VALUE]
            });
        args.marks.cluster.aggregate.measures = measureArray;
    }

    if (
        ["circle", "heatmap", "contour", "pie"].includes(
            args.marks.cluster.mode
        ) &&
        args.marks.cluster.aggregate.measures.length > 1
    )
        throw new Error(
            "Constructing SSV: more than one measure column specified for " +
                args.marks.cluster.mode +
                " mode."
        );
    if (args.marks.cluster.mode == "radar")
        for (var i = 0; i < args.marks.cluster.aggregate.measures.length; i++)
            if (!("extent" in args.marks.cluster.aggregate.measures[i]))
                throw new Error(
                    "Constructing SSV: extent in aggregate measures required for radar charts."
                );
    if (
        args.marks.cluster.mode == "pie" &&
        args.marks.cluster.aggregate.measures.length != 1
    )
        throw new Error(
            "Constructing SSV: there must be exactly 1 aggregate measure for pie charts."
        );
    if ("rankList" in args.marks.hover) {
        if ("tooltip" in args.marks.hover)
            throw new Error(
                "Constructing SSV: rankList and tooltip cannot be specified together."
            );
    }
    if ("tooltip" in args.marks.hover) {
        if (
            "aliases" in args.marks.hover.tooltip &&
            args.marks.hover.tooltip.aliases.length !==
                args.marks.hover.tooltip.columns.length
        )
            throw new Error(
                "Constructing SSV: tooltip aliases (marks.hover.tooltip.aliases) " +
                    "must have the same number of elements as columns (marks.hover.tooltip.columns)."
            );
    }

    /************************
     * setting generic params
     ************************/
    this.aggKeyDelimiter = "__";
    this.loX = "extent" in args.layout.x ? args.layout.x.extent[0] : null;
    this.loY = "extent" in args.layout.y ? args.layout.y.extent[0] : null;
    this.hiX = "extent" in args.layout.x ? args.layout.x.extent[1] : null;
    this.hiY = "extent" in args.layout.y ? args.layout.y.extent[1] : null;

    /************************
     * setting cluster params
     ************************/
    this.clusterParams = args.marks.cluster.config;
    this.clusterParams.numberFormat = args.config.numberFormat;

    /********************************
     * setting aggregation parameters
     ********************************/
    this.aggregateParams = {
        aggDimensions: args.marks.cluster.aggregate.dimensions,
        aggMeasures: args.marks.cluster.aggregate.measures
    };

    // add count(*) to measure if not present
    var hasCount = false;
    for (var i = 0; i < this.aggregateParams.aggMeasures.length; i++)
        if (this.aggregateParams.aggMeasures[i].function == "count")
            hasCount = true;
    if (!hasCount)
        this.aggregateParams.aggMeasures.push({
            function: "count",
            field: "*"
        });

    // combinations of domain values from all columns
    this.aggregateParams.aggDomain = [];
    var dimensions = args.marks.cluster.aggregate.dimensions;
    var pointers = [];
    for (var i = 0; i < dimensions.length; i++) pointers.push(0);
    while (true) {
        var curDomain = "";
        for (var i = 0; i < dimensions.length; i++) {
            if (i > 0) curDomain += this.aggKeyDelimiter;
            curDomain += dimensions[i].domain[pointers[i]];
        }
        this.aggregateParams.aggDomain.push(curDomain);

        // next combination
        var pos = dimensions.length - 1;
        while (pos >= 0 && pointers[pos] >= dimensions[pos].domain.length - 1)
            pos--;
        if (pos < 0) break;
        pointers[pos]++;
        for (var i = pos + 1; i < dimensions.length; i++) pointers[i] = 0;
    }

    /************************
     * setting hover params
     ************************/
    this.hoverParams = {};
    if ("rankList" in args.marks.hover) {
        // get in everything in config
        this.hoverParams = args.marks.hover.rankList.config;

        // mode: currently either tabular or custom
        this.hoverParams.hoverRankListMode = args.marks.hover.rankList.mode;

        // table fields
        if (args.marks.hover.rankList.mode == "tabular")
            this.hoverParams.hoverTableFields =
                args.marks.hover.rankList.fields;

        // custom topk renderer
        if (args.marks.hover.rankList.mode == "custom")
            this.hoverParams.hoverCustomRenderer =
                args.marks.hover.rankList.custom;

        // topk is 1 by default if unspecified
        this.hoverParams.topk = args.marks.hover.rankList.topk;

        // orientation of custom ranks
        this.hoverParams.hoverRankListOrientation =
            args.marks.hover.rankList.orientation;
    }
    if ("boundary" in args.marks.hover)
        this.hoverParams.hoverBoundary = args.marks.hover.boundary;
    this.topk = "topk" in this.hoverParams ? this.hoverParams.topk : 0;
    this.hoverSelector =
        "selector" in args.marks.hover ? args.marks.hover.selector : null;
    this.tooltipColumns = this.tooltipAliases = null;
    if ("tooltip" in args.marks.hover) {
        this.tooltipColumns = args.marks.hover.tooltip.columns;
        if ("aliases" in args.marks.hover.tooltip)
            this.tooltipAliases = args.marks.hover.tooltip.aliases;
        else this.tooltipAliases = this.tooltipColumns;
    }

    /***************************
     * setting axis parameters
     ***************************/
    this.axisParams = {};
    this.axis = args.config.axis;
    this.axisParams.xAxisTitle =
        "xAxisTitle" in args.config
            ? args.config.xAxisTitle
            : args.layout.x.field;
    this.axisParams.yAxisTitle =
        "yAxisTitle" in args.config
            ? args.config.yAxisTitle
            : args.layout.y.field;

    /****************
     * setting bboxes
     ****************/
    if (args.marks.cluster.mode == "custom") {
        if (
            !("bboxW" in args.marks.cluster.config) ||
            !("bboxH" in args.marks.cluster.config)
        )
            throw new Error("Constructing SSV: bboxW or bboxH missing");
        this.bboxW = args.marks.cluster.config.bboxW;
        this.bboxH = args.marks.cluster.config.bboxH;
    } else if (args.marks.cluster.mode == "circle")
        this.bboxW = this.bboxH = this.clusterParams.circleMaxSize * 2;
    else if (args.marks.cluster.mode == "contour")
        this.bboxW = this.bboxH = this.clusterParams.contourRadius * 2;
    else if (args.marks.cluster.mode == "heatmap")
        this.bboxW = this.bboxH = this.clusterParams.heatmapRadius * 2 + 1;
    else if (args.marks.cluster.mode == "radar")
        // tuned by hand :)
        this.bboxW = this.bboxH = 290;
    else if (args.marks.cluster.mode == "pie") this.bboxW = this.bboxH = 290;
    // tuned by hand :)
    else if (args.marks.cluster.mode == "dot")
        this.bboxW = this.bboxH = Math.floor(
            this.clusterParams.dotMaxSize * 2.5
        );

    // assign other fields
    this.query = args.data.query.toLowerCase();
    while (this.query.slice(-1) == " " || this.query.slice(-1) == ";")
        this.query = this.query.slice(0, -1);
    this.query +=
        " order by " + args.layout.z.field + " " + args.layout.z.order + ";";
    // assume query is like select * from tbl order by...
    this.rawTable = this.query
        .substring(
            this.query.indexOf("from") + 4,
            this.query.indexOf("order by")
        )
        .replace(/\s/g, "");
    this.db = args.data.db;
    this.geoInitialLevel = "geo" in args.layout ? args.layout.geo.level : -1;
    this.geoLat = "geo" in args.layout ? args.layout.geo.center[0] : 0;
    this.geoLon = "geo" in args.layout ? args.layout.geo.center[1] : 0;
    this.geoLonCol = "geo" in args.layout ? args.layout.x.field : "";
    this.geoLatCol = "geo" in args.layout ? args.layout.y.field : "";
    if ("geo" in args.layout) {
        // add kyrix_geo_x && kyrix_geo_y in the query
        var selectPos = this.query.toLowerCase().search("select");
        this.query =
            "select kyrix_geo_x, kyrix_geo_y, " +
            this.query.substring(selectPos + 6);
    }
    this.xCol = "geo" in args.layout ? "kyrix_geo_x" : args.layout.x.field;
    this.yCol = "geo" in args.layout ? "kyrix_geo_y" : args.layout.y.field;
    this.zCol = args.layout.z.field;
    this.zOrder = args.layout.z.order;
    this.clusterMode = args.marks.cluster.mode;
    this.aggDimensionFields = [];
    for (var i = 0; i < this.aggregateParams.aggDimensions.length; i++)
        this.aggDimensionFields.push(
            this.aggregateParams.aggDimensions[i].field
        );
    this.aggMeasureFields = [];
    this.aggMeasureFuncs = [];
    for (var i = 0; i < this.aggregateParams.aggMeasures.length; i++) {
        this.aggMeasureFields.push(this.aggregateParams.aggMeasures[i].field);
        this.aggMeasureFuncs.push(this.aggregateParams.aggMeasures[i].function);
    }
    this.clusterCustomRenderer =
        "custom" in args.marks.cluster ? args.marks.cluster.custom : null;
    this.columnNames = args.data.columnNames;
    this.numLevels = args.config.numLevels;
    this.topLevelWidth = args.config.topLevelWidth;
    this.topLevelHeight = args.config.topLevelHeight;
    if ("geo" in args.layout) {
        (this.loX = 0), (this.hiX = this.topLevelWidth);
        (this.loY = 0), (this.hiY = this.topLevelHeight);
    }
    this.mapBackground = args.config.map;
    this.zoomFactor = args.config.zoomFactor;
    this.overlap =
        "overlap" in args.layout
            ? args.layout.overlap
            : this.clusterMode == "contour" || this.clusterMode == "heatmap"
            ? 0
            : 1;
    this.mergeClusterAggs = mergeClusterAggs.toString();
    this.getCoordinatesFromLatLonBody = getBodyStringOfFunction(
        getCoordinatesFromLatLon
    );
    this.getCitusSpatialHashKeyBody = getBodyStringOfFunction(
        getCitusSpatialHashKey
    );
    this.singleNodeClusteringBody = getBodyStringOfFunction(
        singleNodeClustering
    );
    this.mergeClustersAlongSplitsBody = getBodyStringOfFunction(
        mergeClustersAlongSplits
    );
}

// function used for process cluster aggs
function processClusterAgg(data, params) {
    function getConvexCoordinates(d) {
        var coords = d.clusterAgg.convexHull;
        var convexHull = [];
        for (var i = 0; i < coords.length; i++) {
            convexHull.push({
                x: +coords[i][0],
                y: +coords[i][1]
            });
        }
        convexHull.push({x: +coords[0][0], y: +coords[0][1]});
        return convexHull;
    }

    data.forEach(d => {
        d.clusterAgg = JSON.parse(d.clusterAgg);
        d.convexHull = getConvexCoordinates(d);
        for (var i = 0; i < params.aggDomain.length; i++)
            for (var j = 0; j < params.aggMeasures.length; j++) {
                var curField = params.aggMeasures[j].field;
                var curFunc = params.aggMeasures[j].function;
                var curKey =
                    params.aggDomain[i] +
                    (params.aggDomain[i] == "" ? "" : params.aggKeyDelimiter) +
                    curFunc +
                    "(" +
                    curField +
                    ")";
                if (!(curKey in d.clusterAgg)) {
                    switch (curFunc) {
                        case "count":
                        case "sum":
                        case "avg":
                        case "sqrsum":
                            d.clusterAgg[curKey] = 0;
                            break;
                        case "min":
                            d.clusterAgg[curKey] = Number.MIN_VALUE;
                            break;
                        case "max":
                            d.clusterAgg[curKey] = Number.MAX_VALUE;
                            break;
                    }
                }
            }
    });
}

// get rendering function for an SSV layer based on cluster mode
function getLayerRenderer() {
    function renderCircleBody() {
        var rpKey = "ssv_" + args.ssvId.substring(0, args.ssvId.indexOf("_"));
        var params = args.renderingParams[rpKey];
        params.processClusterAgg(data, params);

        // set up d3.scale for circle/text size
        var agg;
        var curMeasure = params.aggMeasures[0];
        agg = curMeasure.function + "(" + curMeasure.field + ")";
        var minDomain = params[args.ssvId + "_" + agg + "_min"];
        var maxDomain = params[args.ssvId + "_" + agg + "_max"];
        var circleSizeInterpolator = d3
            .scaleSqrt()
            .domain([minDomain, maxDomain])
            .range([params.circleMinSize, params.circleMaxSize]);

        // append circles & text
        var g = svg.append("g").classed("hovercircle", true);
        g.style("opacity", 0);
        g.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("r", function(d) {
                return circleSizeInterpolator(d.clusterAgg[agg]);
            })
            .attr("cx", function(d) {
                return d.cx;
            })
            .attr("cy", function(d) {
                return d.cy;
            })
            .style("fill-opacity", 0.5)
            //            .attr("fill", "honeydew")
            .attr("fill", "#d7dbff")
            //            .attr("stroke", "#ADADAD")
            //            .style("stroke-width", "1px")
            .style("pointer-events", "fill")
            .classed("kyrix-retainsizezoom", true);
        g.selectAll("text")
            .data(data)
            .enter()
            .append("text")
            .attr("dy", "0.3em")
            .text(function(d) {
                return d3.format(params.numberFormat)(+d.clusterAgg[agg]);
            })
            .attr("font-size", function(d) {
                return circleSizeInterpolator(d.clusterAgg[agg]) / 2;
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
            //            .style("fill", "navy")
            .style("fill", "#0f00d0")
            .style("pointer-events", "none")
            .classed("kyrix-retainsizezoom", true)
            .each(function(d) {
                params.textwrap(
                    d3.select(this),
                    circleSizeInterpolator(d.clusterAgg[agg]) * 1.5
                );
            });

        // fade in
        g.transition()
            .duration(params.fadeInDuration)
            .style("opacity", 1);

        // for hover
        var hoverSelector = "circle";
    }

    function renderObjectClusterNumBody() {
        var g = svg.select("g:last-of-type");
        var rpKey = "ssv_" + args.ssvId.substring(0, args.ssvId.indexOf("_"));
        var params = args.renderingParams[rpKey];
        g.selectAll(".clusternum")
            .data(data)
            .enter()
            .append("text")
            .text(function(d) {
                return d3.format(
                    params.numberFormat
                )(+JSON.parse(d.clusterAgg)["count(*)"]);
            })
            .attr("x", function(d) {
                return +d.cx;
            })
            .attr("y", function(d) {
                // TODO: y offset needs to be exposed as a parameter
                return +d.miny + 13;
            })
            .attr("dy", ".35em")
            .attr("font-size", 18)
            .attr("text-anchor", "middle")
            .attr("fill", "#f47142")
            .style("fill-opacity", 1)
            .classed("kyrix-retainsizezoom", true);
    }

    function renderContourBody() {
        var rpKey = "ssv_" + args.ssvId.substring(0, args.ssvId.indexOf("_"));
        var params = args.renderingParams[rpKey];
        var roughN = params.roughN;
        var bandwidth = params.contourBandwidth;
        var radius = params.contourRadius;
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
            w: +JSON.parse(d.clusterAgg)["count(*)"]
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

        ///////////////// uncomment the following for rendering using canvas
        // var canvas = document.createElement("canvas");
        // var ctx = canvas.getContext("2d");
        // (canvas.width = contourWidth), (canvas.height = contourHeight);
        // g.append("foreignObject")
        //     .attr("x", 0)
        //     .attr("y", 0)
        //     .attr("width", contourWidth)
        //     .attr("height", contourHeight)
        //     .style("overflow", "auto")
        //     .node()
        //     .appendChild(canvas);
        // d3.select(canvas).style("opacity", REPLACE_ME_CONTOUR_OPACITY);
        // var path = d3.geoPath().context(ctx);
        // for (var i = 0; i < contours.length; i++) {
        //     var contour = contours[i];
        //     var threshold = contour.value;
        //     ctx.beginPath(),
        //         (ctx.fillStyle = color(threshold)),
        //         path(contour),
        //         ctx.fill();
        // }
    }

    function renderHeatmapBody() {
        var rpKey = "ssv_" + args.ssvId.substring(0, args.ssvId.indexOf("_"));
        var params = args.renderingParams[rpKey];
        var agg;
        var curMeasure = params.aggMeasures[0];
        agg = curMeasure.function + "(" + curMeasure.field + ")";
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
            w: +JSON.parse(d.clusterAgg)[agg]
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
        var minWeight = params[args.ssvId + "_" + agg + "_min"]; // set in the BGRP (back-end generated rendering params)
        var maxWeight = params[args.ssvId + "_" + agg + "_max"]; // set in the BGRP
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
        var rpKey = "ssv_" + args.ssvId.substring(0, args.ssvId.indexOf("_"));
        var params = args.renderingParams[rpKey];
        var g = svg.append("g");
        g.style("opacity", 0);

        // Step 1: Pre-process clusterAgg
        params.processClusterAgg(data, params);

        // Step 2: append radars
        var radars = g
            .selectAll("g.radar")
            .data(data)
            .enter();

        // radar chart, for average
        var radius = params.radarRadius;

        // ticks
        var ticks = [];
        for (var i = 0; i < params.radarTicks; i++)
            ticks.push((i + 1) * (radius / params.radarTicks));

        // line
        var line = d3
            .line()
            .x(d => d.x)
            .y(d => d.y);

        function getPathCoordinates(d) {
            var coordinates = [];
            for (var i = 0; i < params.aggMeasures.length; i++) {
                var curMeasure = params.aggMeasures[i];
                if (!("extent" in curMeasure)) continue;
                var curAggKey =
                    curMeasure.function + "(" + curMeasure.field + ")";
                var angle =
                    Math.PI / 2 + (2 * Math.PI * i) / params.aggMeasures.length;
                // average
                coordinates.push(
                    angleToCoordinate(
                        d,
                        angle,
                        curMeasure.extent[0],
                        curMeasure.extent[1],
                        +d.clusterAgg[curAggKey]
                    )
                );
            }
            coordinates.push(coordinates[0]);
            return coordinates;
        }

        function angleToCoordinate(d, angle, lo, hi, value) {
            var curScale = d3
                .scaleLinear()
                .domain([lo, hi])
                .range([0, radius]);
            var x = Math.cos(angle) * curScale(value);
            var y = Math.sin(angle) * curScale(value);
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
            // axis & labels
            for (var i = 0; i < params.aggMeasures.length; i++) {
                var curMeasure = params.aggMeasures[i];
                if (!("extent" in curMeasure)) continue;
                var angle =
                    Math.PI / 2 + (2 * Math.PI * i) / params.aggMeasures.length;
                var lineCoords = angleToCoordinate(
                    p,
                    angle,
                    curMeasure.extent[0],
                    curMeasure.extent[1],
                    curMeasure.extent[1]
                );
                var labelCoords = angleToCoordinate(
                    p,
                    angle,
                    curMeasure.extent[0],
                    curMeasure.extent[1],
                    curMeasure.extent[1] * 1.1
                );

                //draw axis line
                d3.select(nodes[j])
                    .append("line")
                    .attr("x1", p.cx)
                    .attr("y1", p.cy)
                    .attr("x2", lineCoords.x)
                    .attr("y2", lineCoords.y)
                    .classed("kyrix-retainsizezoom", true)
                    .attr("stroke", "black");

                //draw axis label
                d3.select(nodes[j])
                    .append("text")
                    .classed("label", true)
                    .attr("x", labelCoords.x)
                    .attr("y", labelCoords.y)
                    .classed("kyrix-retainsizezoom", true)
                    .text(curMeasure.field.substr(0, 3).toUpperCase());
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
                    return d3.format(
                        params.numberFormat
                    )(d.clusterAgg["count(*)"]);
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

        // fade in
        g.transition()
            .duration(params.fadeInDuration)
            .style("opacity", 1);

        // for hover
        g.selectAll(".radarhover")
            .data(data)
            .enter()
            .append("circle")
            .classed("radarhover", true)
            .attr("cx", d => d.cx)
            .attr("cy", d => d.cy)
            .attr("r", radius)
            .style("opacity", 0);
        var hoverSelector = ".radarhover";
    }

    function renderPieBody() {
        if (!data || data.length == 0) return;
        var rpKey = "ssv_" + args.ssvId.substring(0, args.ssvId.indexOf("_"));
        var params = args.renderingParams[rpKey];
        var aggKeyDelimiter = params.aggKeyDelimiter;
        var parse = params.parsePathIntoSegments;
        var translate = params.translatePathSegments;
        var serialize = params.serializePath;

        var g = svg.append("g");
        g.style("opacity", 0);

        // Step 1: Pre-process clusterAgg
        params.processClusterAgg(data, params);

        // Step 2: append pies
        var pie = d3.pie().value(function(d) {
            return d.value;
        });

        var aggKeys = [];
        for (var i = 0; i < params.aggDomain.length; i++)
            aggKeys.push(
                params.aggDomain[i] +
                    (params.aggDomain[i] == "" ? "" : aggKeyDelimiter) +
                    params.aggMeasures[0].function +
                    "(" +
                    params.aggMeasures[0].field +
                    ")"
            );
        var color = d3.scaleOrdinal(d3.schemeTableau10).domain(aggKeys);
        var arc = d3
            .arc()
            .innerRadius(params.pieInnerRadius)
            .outerRadius(params.pieOuterRadius)
            .cornerRadius(params.pieCornerRadius)
            .padAngle(params.padAngle);
        var scalePercent = d3
            .scaleLinear()
            .domain([0, 2 * Math.PI])
            .range([0, 1]);
        var formatter = d3.format(".1%");
        var slicedata = [];

        data.forEach((p, j) => {
            p.arcs = pie(
                d3
                    .entries(p.clusterAgg)
                    .filter(d => aggKeys.indexOf(d.key) >= 0)
            );
            var cooked = p.arcs.map(entry => {
                // for (var index in pos) entry[pos[index]] = +p[pos[index]];
                for (var key in p) entry[key] = p[key];
                entry.data.percentage = formatter(
                    scalePercent(entry.endAngle - entry.startAngle)
                );
                entry.convexHull = p.convexHull;
                return entry;
            });
            slicedata = slicedata.concat(cooked);
        });

        // slices
        g.selectAll("path.slice")
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

        // numbers
        g.selectAll("text.cluster_num")
            .data(data)
            .enter()
            .append("text")
            .classed("cluster_num", true)
            .text(d =>
                d3.format(params.numberFormat)(+d.clusterAgg["count(*)"])
            )
            .attr("x", d => +d.cx)
            .attr("y", d => +d.cy - params.pieOuterRadius)
            // .attr("dy", ".35em")
            .attr("font-size", params.pieOuterRadius / 2.5)
            .attr("text-anchor", "middle")
            .style("fill-opacity", 0.8)
            .style("fill", "grey")
            .style("pointer-events", "none")
            .classed("kyrix-retainsizezoom", true);

        // fade in
        g.transition()
            .duration(params.fadeInDuration)
            .style("opacity", 1);

        // for hover
        g.selectAll(".piehover")
            .data(data)
            .enter()
            .append("circle")
            .classed("piehover", true)
            .attr("cx", d => d.cx)
            .attr("cy", d => d.cy)
            .attr("r", params.pieOuterRadius)
            .style("opacity", 0);
        var hoverSelector = ".piehover";
    }

    function renderDotBody() {
        if (!data || data.length == 0) return;

        var rpKey = "ssv_" + args.ssvId.substring(0, args.ssvId.indexOf("_"));
        var params = args.renderingParams[rpKey];
        var g = svg.append("g");
        params.processClusterAgg(data, params);

        // size scale
        var dotSizeScale = null;
        if ("dotSizeColumn" in params)
            dotSizeScale = d3
                .scaleLinear()
                .domain(params.dotSizeDomain)
                .range([0, params.dotMaxSize]);

        // color scale
        var dotColorScale = null;
        if ("dotColorColumn" in params)
            dotColorScale = d3.scaleOrdinal(
                params.dotColorDomain,
                d3.schemeTableau10
            );

        g.selectAll(".ssvdot")
            .data(data)
            .join("circle")
            .attr("r", d =>
                "dotSizeColumn" in params
                    ? dotSizeScale(+d[params.dotSizeColumn])
                    : params.dotMaxSize
            )
            .attr("cx", d => +d.cx)
            .attr("cy", d => +d.cy)
            .style("fill-opacity", 0)
            .attr("stroke", d =>
                "dotColorColumn" in params
                    ? dotColorScale(d[params.dotColorColumn])
                    : "#38c2e0"
            )
            .style("stroke-width", "2px")
            .classed("kyrix-retainsizezoom", true);
    }

    function regularHoverBody() {
        function convexRenderer(svg, d) {
            var line = d3
                .line()
                .x(d => d.x)
                .y(d => d.y);
            var g = svg.append("g");
            g.append("path")
                .datum(d)
                .attr("class", "convexHull")
                .attr("id", "ssv_boundary_hover")
                .attr("d", d => line(d.convexHull))
                .style("fill-opacity", 0)
                .style("stroke-width", 3)
                .style("stroke-opacity", 0.5)
                .style("stroke", "grey")
                .style("pointer-events", "none");
        }

        function bboxRenderer(svg, d) {
            var minx = 1e100,
                miny = 1e100;
            var maxx = -1e100,
                maxy = -1e100;
            for (var i = 0; i < d.convexHull.length; i++) {
                minx = Math.min(minx, d.convexHull[i].x);
                miny = Math.min(miny, d.convexHull[i].y);
                maxx = Math.max(maxx, d.convexHull[i].x);
                maxy = Math.max(maxy, d.convexHull[i].y);
            }
            g = svg.append("g");
            g.append("rect")
                .attr("x", minx)
                .attr("y", miny)
                .attr("rx", 5)
                .attr("ry", 5)
                .attr("width", maxx - minx)
                .attr("height", maxy - miny)
                .style("fill-opacity", 0)
                .style("stroke-width", 3)
                .style("stroke-opacity", 0.5)
                .style("stroke", "grey")
                .style("pointer-events", "none");
        }

        function tabularRankListRenderer(svg, data, args) {
            var rpKey =
                "ssv_" + args.ssvId.substring(0, args.ssvId.indexOf("_"));
            var params = args.renderingParams[rpKey];
            var charW = 8;
            var charH = 15;
            var paddingH = 10;
            var paddingW = 14;
            var headerH = charH + 20;

            var g = svg
                .append("g")
                .attr("id", "tabular_hover")
                .attr("class", "tabular ranklist");
            var fields = params.hoverTableFields;
            var widths = [];
            var totalW = 0,
                totalH = data.length * (charH + paddingH) + headerH;
            for (var i = 0; i < fields.length; i++) {
                var maxlen = 0;
                for (var j = 0; j < data.length; j++) {
                    if (!isNaN(data[j][fields[i]]))
                        data[j][fields[i]] = d3.format(params.numberFormat)(
                            +data[j][fields[i]]
                        );
                    maxlen = Math.max(
                        maxlen,
                        data[j][fields[i]].toString().length
                    );
                }
                maxlen = Math.max(maxlen, fields[i].length);
                widths.push(maxlen * charW + paddingW);
                totalW += widths[i];
            }
            var basex = data[0].cx - totalW / 2;
            var basey = data[0].cy - totalH / 2;
            var runx = basex,
                runy = basey;
            for (var i = 0; i < fields.length; i++) {
                var width = widths[i];
                // th
                g.append("rect")
                    .attr("x", runx)
                    .attr("y", runy)
                    .attr("width", width)
                    .attr("height", headerH)
                    .attr("style", "fill: #888888; stroke: #c0c4c3;");
                g.append("text")
                    .text(fields[i])
                    .attr("x", runx + width / 2)
                    .attr("y", runy + headerH / 2)
                    .attr("style", "fill: #f8f4ed;")
                    .style("text-anchor", "middle")
                    .style("font-size", charH + "px")
                    .attr("dy", "0.35em");
                runy += headerH;
                // tr
                for (var j = 0; j < data.length; j++) {
                    g.append("rect")
                        .attr("x", runx)
                        .attr("y", runy)
                        .attr("width", width)
                        .attr("height", charH + paddingH)
                        .attr("style", "fill: #ebebeb; stroke: #c0c4c3;");
                    g.append("text")
                        .text(data[j][fields[i]])
                        .attr("x", runx + width / 2)
                        .attr("y", runy + (charH + paddingH) / 2)
                        .style("text-anchor", "middle")
                        .style("font-size", charH + "px")
                        .attr("dy", "0.35em");
                    runy += charH + paddingH;
                }
                runx += width;
                runy = basey;
            }
        }

        // ranklist
        if ("hoverRankListMode" in params) {
            var rankListRenderer;
            if (params.hoverRankListMode == "tabular")
                rankListRenderer = tabularRankListRenderer;
            else rankListRenderer = params.hoverCustomRenderer;
            g.selectAll(hoverSelector)
                .on("mouseenter.ranklist", function(d) {
                    // deal with top-k here
                    // run rankListRenderer for each of the top-k
                    // for tabular renderer, add a header first
                    // use params.hoverRankListOrientation for deciding layout
                    // use params.bboxH(W) for bounding box size
                    var g = svg.append("g").attr("id", "ssv_ranklist_hover");
                    var topKData = d.clusterAgg.topk;
                    var topk = topKData.length;
                    for (var i = 0; i < topk; i++) {
                        topKData[i].cx = +d.cx;
                        topKData[i].cy = +d.cy;
                    }
                    if (params.hoverRankListMode == "tabular")
                        rankListRenderer(g, topKData, args);
                    else {
                        var orientation = params.hoverRankListOrientation;
                        var bboxW = params.bboxW;
                        var bboxH = params.bboxH;
                        for (var i = 0; i < topk; i++) {
                            var transX = 0,
                                transY = 0;
                            if (orientation == "vertical")
                                transY = bboxH * (-topk / 2.0 + 0.5 + i);
                            else transX = bboxW * (-topk / 2.0 + 0.5 + i);
                            topKData[i].cx += transX;
                            topKData[i].cy += transY;
                            rankListRenderer(g, [topKData[i]], args);
                        }
                    }
                    g.style("opacity", 0.8)
                        .style("pointer-events", "none")
                        .selectAll("g")
                        .selectAll("*")
                        .datum({cx: +d.cx, cy: +d.cy})
                        .classed("kyrix-retainsizezoom", true)
                        .each(function() {
                            zoomRescale(args.viewId, this);
                        });
                })
                .on("mouseleave.ranklist", function() {
                    d3.selectAll("#ssv_ranklist_hover").remove();
                });
        }

        // boundary
        if ("hoverBoundary" in params)
            g.selectAll(hoverSelector)
                .on("mouseover.boundary", function(d) {
                    var g = svg.append("g").attr("id", "ssv_boundary_hover");
                    if (params.hoverBoundary == "convexhull")
                        convexRenderer(g, d);
                    else if (params.hoverBoundary == "bbox") bboxRenderer(g, d);
                })
                .on("mouseleave.boundary", function() {
                    d3.selectAll("#ssv_boundary_hover").remove();
                });
    }

    function customClusterModeHoverBody() {
        var rpKey = "ssv_" + args.ssvId.substring(0, args.ssvId.indexOf("_"));
        var params = args.renderingParams[rpKey];
        params.processClusterAgg(data, params);
    }

    function KDEObjectHoverBody() {
        // no topk for KDE for now
        var objectRenderer = params.hoverCustomRenderer;
        if (objectRenderer == null) return;
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
                    .attr("id", "ssv_tooltip")
                    .style("opacity", 0.8)
                    .style("pointer-events", "none")
                    .selectAll("*")
                    .classed("kyrix-retainsizezoom", true)
                    .each(function() {
                        zoomRescale(args.viewId, this);
                    });
            })
            .on("mouseleave", function() {
                d3.select("#ssv_tooltip").remove();
            });
    }

    var renderFuncBody;
    if (this.clusterMode == "custom") {
        renderFuncBody =
            "(" +
            this.clusterCustomRenderer.toString() +
            ")(svg, data, args);\n";
        if (this.clusterParams.clusterCount)
            renderFuncBody += getBodyStringOfFunction(
                renderObjectClusterNumBody
            );
        if (this.hoverSelector) {
            renderFuncBody +=
                'var hoverSelector = "' + this.hoverSelector + '";\n';
            renderFuncBody += getBodyStringOfFunction(
                customClusterModeHoverBody
            );
            renderFuncBody += getBodyStringOfFunction(regularHoverBody);
        }
    } else if (this.clusterMode == "circle") {
        // render circle
        renderFuncBody = getBodyStringOfFunction(renderCircleBody);
        renderFuncBody += getBodyStringOfFunction(regularHoverBody);
    } else if (this.clusterMode == "contour") {
        renderFuncBody = getBodyStringOfFunction(renderContourBody);
        renderFuncBody += getBodyStringOfFunction(KDEObjectHoverBody);
    } else if (this.clusterMode == "heatmap") {
        renderFuncBody = getBodyStringOfFunction(renderHeatmapBody);
        renderFuncBody += getBodyStringOfFunction(KDEObjectHoverBody);
    } else if (this.clusterMode == "radar") {
        renderFuncBody = getBodyStringOfFunction(renderRadarBody);
        renderFuncBody += getBodyStringOfFunction(regularHoverBody);
    } else if (this.clusterMode == "pie") {
        renderFuncBody = getBodyStringOfFunction(renderPieBody);
        renderFuncBody += getBodyStringOfFunction(regularHoverBody);
    } else if (this.clusterMode == "dot") {
        renderFuncBody = getBodyStringOfFunction(renderDotBody);
        renderFuncBody += getBodyStringOfFunction(regularHoverBody);
    }
    return new Function("svg", "data", "args", renderFuncBody);
}

// get axes renderer
function getAxesRenderer() {
    function axesRendererBodyTemplate() {
        var cWidth = args.canvasW,
            cHeight = args.canvasH,
            axes = [];
        var rpKey = args.axesSSVRPKey;
        var params = args.renderingParams[rpKey];

        var styling = function(axesg, dim, id, args) {
            axesg
                .selectAll(".tick line")
                .attr("stroke", "#CCC")
                .attr("stroke-dasharray", "5, 5")
                .style("opacity", 0.3);
            axesg.attr("font-family", "Open Sans").attr("font-size", "13");
            axesg
                .selectAll("g")
                .selectAll("text")
                .style("fill", "#999");
            axesg.selectAll("path").remove();
            if (dim == "x")
                axesg
                    .append("text")
                    .text(params.xAxisTitle)
                    .attr("fill", "black")
                    .attr("text-anchor", "middle")
                    .attr(
                        "transform",
                        "translate(" + args.viewportW / 2 + ", 40)"
                    );
            else
                axesg
                    .append("text")
                    .text(params.yAxisTitle)
                    .attr("fill", "black")
                    .attr("text-anchor", "middle")
                    .attr(
                        "transform",
                        "translate(-60, " + args.viewportH / 2 + ") rotate(-90)"
                    );
        };
        var xOffset =
            (params.bboxW / 2) * Math.pow(params.zoomFactor, args.pyramidLevel);
        var yOffset =
            (params.bboxH / 2) * Math.pow(params.zoomFactor, args.pyramidLevel);
        //x
        var x = d3
            .scaleLinear()
            .domain([params.loX, params.hiX])
            .range([xOffset, cWidth - xOffset]);
        /*        var stDate = new Date(0),
            enDate = new Date(0);
        stDate.setUTCSeconds(1356998400);
        enDate.setUTCSeconds(1425167999);
        var x = d3
            .scaleTime()
            .domain([stDate, enDate])
            .range([REPLACE_ME_xOffset, cWidth - REPLACE_ME_xOffset]);*/
        var xAxis = d3
            .axisBottom()
            .tickSize(-cHeight)
            .tickFormat(d3.format("~s"));
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
            .domain([params.loY, params.hiY])
            .range([yOffset, cHeight - yOffset]);
        var yAxis = d3
            .axisLeft()
            .tickSize(-cWidth)
            .tickFormat(d3.format("~s"));
        axes.push({
            dim: "y",
            scale: y,
            axis: yAxis,
            translate: [0, 0],
            styling: styling
        });
        return axes;
    }

    var axesFuncBody = getBodyStringOfFunction(axesRendererBodyTemplate);
    return new Function("args", axesFuncBody);
}

function getLegendRenderer() {
    function pieLegendRendererBody() {
        var rpKey = "ssv_" + args.ssvId.substring(0, args.ssvId.indexOf("_"));
        var params = args.renderingParams[rpKey];
        var g = svg
            .append("g")
            .attr("class", "legendOrdinal")
            .attr("transform", "translate(50,50) scale(2.0)");

        var color = d3
            .scaleOrdinal(d3.schemeTableau10)
            .domain(
                "pieLegendDomain" in params
                    ? params.pieLegendDomain
                    : params.aggDomain
            );
        var legendOrdinal = d3
            .legendColor()
            //d3 symbol creates a path-string, for example
            //"M0,-8.059274488676564L9.306048591020996,
            //8.059274488676564 -9.306048591020996,8.059274488676564Z"
            // .shape("path", d3.symbol().type(d3.symbolDiamond).size(150)())
            .shape("rect")
            //.orient("horizontal")
            .shapePadding(10)
            .title(params.pieLegendTitle)
            .labelOffset(15)
            //.titleWidth(200)
            // .labelAlign("start")
            .scale(color);

        // add legend to g
        g.call(legendOrdinal);
    }

    function dotLegendRendererBody() {
        var rpKey = "ssv_" + args.ssvId.substring(0, args.ssvId.indexOf("_"));
        var params = args.renderingParams[rpKey];

        // a <g> for holding the legends
        var legendG = svg
            .append("g")
            .classed("ssv_dot_legend", true)
            .style("opacity", 0.5)
            .attr("transform", "translate(50, 0)");

        // horizontal offset
        var offset = 0;
        // size legend
        if ("dotSizeColumn" in params) {
            var dotSizeScale = d3
                .scaleLinear()
                .domain(params.dotSizeDomain)
                .range([0, params.dotMaxSize]);
            var legendSize = d3
                .legendSize()
                .scale(dotSizeScale)
                .shape("circle")
                .shapePadding(25)
                .labelOffset(20)
                .title(
                    "dotSizeLegendTitle" in params
                        ? params.dotSizeLegendTitle
                        : "Point Size"
                )
                .orient("horizontal");
            legendG
                .append("g")
                .attr("transform", `translate(${offset}, 20)`)
                .call(legendSize);
            offset += 200;
        }

        // color legend
        if ("dotColorColumn" in params) {
            var dotColorScale = d3.scaleOrdinal(
                params.dotColorDomain,
                d3.schemeTableau10
            );
            var legendColor = d3
                .legendColor()
                .shape("rect")
                .shapePadding(5)
                .title(
                    "dotColorLegendTitle" in params
                        ? params.dotColorLegendTitle
                        : "Point Color"
                )
                .labelOffset(13)
                .scale(dotColorScale);
            legendG
                .append("g")
                .attr("transform", `translate(${offset}, 20) scale(1)`)
                .call(legendColor);
        }

        // transparent rectangle to receive hover events
        legendG
            .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", legendG.node().getBBox().width + 20)
            .attr("height", legendG.node().getBBox().height)
            .style("opacity", 0)
            .on("mouseover", function() {
                d3.selectAll(".ssv_dot_legend").style("opacity", 1);
            })
            .on("mouseout", function() {
                d3.selectAll(".ssv_dot_legend").style("opacity", 0.5);
            });
    }

    var renderFuncBody = "";
    if (this.clusterMode == "pie")
        renderFuncBody = getBodyStringOfFunction(pieLegendRendererBody);
    else if (this.clusterMode == "dot")
        renderFuncBody = getBodyStringOfFunction(dotLegendRendererBody);
    return new Function("svg", "data", "args", renderFuncBody);
}

/** d3 renderer for openstreetmap map tiles **/
function getMapRenderer() {
    function mapRendererBodyTemplate() {
        var rpKey = "ssv_" + args.ssvId.substring(0, args.ssvId.indexOf("_"));
        var params = args.renderingParams[rpKey];
        var tau = 2 * Math.PI;
        var projection = d3
            .geoMercator()
            .scale(1 / tau)
            .translate([0, 0]);
        var vx = args["viewportX"];
        var vy = args["viewportY"];
        var vw = args["viewportW"];
        var vh = args["viewportH"];
        var topLevelWidth = params.hiX - params.loX;
        var topLevelHeight = params.hiY - params.loY;
        var level = +args.ssvId.substring(args.ssvId.indexOf("_") + 1);
        var initialLon = params.geoInitialCenterLon;
        var initialLat = params.geoInitialCenterLat;
        var initialLevel = params.geoInitialLevel;
        var scale = 1 << (initialLevel + level + 8);
        var cx = (projection([initialLon, initialLat])[0] + 0.5) * scale;
        var cy = (projection([initialLon, initialLat])[1] + 0.5) * scale;

        // note: vw/3 because dynamic boxes fetch a box slightly larger than viewport
        var minTileX = Math.floor(
            (cx - (topLevelWidth * (1 << level)) / 2 + vx - vw / 3) / 256
        );
        var maxTileX = Math.floor(
            (cx - (topLevelWidth * (1 << level)) / 2 + vx + vw + vw / 3) / 256
        );
        var minTileY = Math.floor(
            (cy - (topLevelHeight * (1 << level)) / 2 + vy - vh / 3) / 256
        );
        var maxTileY = Math.floor(
            (cy - (topLevelHeight * (1 << level)) / 2 + vy + vh + vh / 3) / 256
        );
        var tiles = [];
        for (var i = minTileX; i <= maxTileX; i++)
            for (var j = minTileY; j <= maxTileY; j++)
                tiles.push([i, j, initialLevel + level]);

        var raster = svg.selectAll("g");
        if (raster.size() == 0) raster = svg.append("g");
        var image = raster.selectAll("image").data(tiles, function(d) {
            return d;
        });
        image.exit().remove();

        var deltaX = image
            .enter()
            .append("image")
            .attr("xlink:href", function(d) {
                return (
                    "http://" +
                    "abc"[d[1] % 3] +
                    ".tile.openstreetmap.org/" +
                    d[2] +
                    "/" +
                    d[0] +
                    "/" +
                    d[1] +
                    ".png"
                );
            })
            .attr("x", function(d) {
                return d[0] * 256 - (cx - (topLevelWidth * (1 << level)) / 2);
            })
            .attr("y", function(d) {
                return d[1] * 256 - (cy - (topLevelHeight * (1 << level)) / 2);
            })
            .attr("width", 256)
            .attr("height", 256);
    }
    var renderFuncBody = getBodyStringOfFunction(mapRendererBodyTemplate);
    return new Function("svg", "data", "args", renderFuncBody);
}

/** PLV8 function used by the SSVInMemoryIndexer to transform geo coordinates**/
function getCoordinatesFromLatLon(lat, lon) {
    if (!("d3" in plv8)) plv8.d3 = require("d3");
    var d3 = plv8.d3;

    var tau = 2 * Math.PI;
    var projection = d3
        .geoMercator()
        .scale(1 / tau)
        .translate([0, 0]);

    var initialLevel = REPLACE_ME_geo_initial_level;
    var initialCenterLat = REPLACE_ME_geo_initial_center_lat;
    var initialCenterLon = REPLACE_ME_geo_initial_center_lon;
    var scale = 1 << (initialLevel + 8);
    var cx = projection([initialCenterLon, initialCenterLat])[0] * scale;
    var cy = projection([initialCenterLon, initialCenterLat])[1] * scale;

    var coords = [lon, lat];
    var px = projection(coords)[0] * scale;
    var py = projection(coords)[1] * scale;
    var width = REPLACE_ME_top_level_width;
    var height = REPLACE_ME_top_level_height;

    return {x: px - (cx - width / 2), y: py - (cy - height / 2)};
}

/**
 * PLV8 function used by the SSVCitusIndexer to calculate Citus
 * hash keys that result in spatial partitions
 * @param cx
 * @param cy
 * @param partitions
 * @param hashkeys
 * @returns {*}
 */
function getCitusSpatialHashKey(cx, cy) {
    if (!("partitions" in plv8)) plv8.partitions = REPLACE_ME_partitions;
    if (!("hashkeys" in plv8)) plv8.hashkeys = REPLACE_ME_hashkeys;

    var partitions = plv8.partitions;
    var hashkeys = plv8.hashkeys;
    var i = 0;
    while (true) {
        if (i * 2 + 1 >= partitions.length)
            return hashkeys[i - (partitions.length - 1) / 2];
        if (
            cx >= partitions[i * 2 + 1][0] &&
            cx <= partitions[i * 2 + 1][2] &&
            cy >= partitions[i * 2 + 1][1] &&
            cy <= partitions[i * 2 + 1][3]
        )
            i = i * 2 + 1;
        else i = i * 2 + 2;
    }
    return -1;
}

/**
 * Merge cluster b in to cluster a. Both are cluster_agg jsons.
 * used by singleNodeClustering & mergeClustersAlongSplits
 * @param a
 * @param b
 */
function mergeClusterAggs(a, b) {
    // count(*)
    a["count(*)"] += b["count(*)"];

    // convex hulls
    for (var i = 0; i < b.convexHull.length; i++)
        a.convexHull.push(b.convexHull[i]);
    if (a.convexHull.length >= 3) a.convexHull = d3.polygonHull(a.convexHull);

    // topk
    for (var i = 0; i < b.topk.length; i++) a.topk.push(b.topk[i]);
    if (zCol != "none")
        a.topk.sort(function(p, q) {
            if (zOrder == "asc") return p[zCol] < q[zCol] ? -1 : 1;
            else return p[zCol] > q[zCol] ? -1 : 1;
        });
    var extra = Math.max(a.topk.length - topk, 0);
    for (var i = 0; i < extra; i++) a.topk.pop();
    //a.topk = a.topk.slice(0, topk);

    // NNM experiments
    a.xysqrsum += b.xysqrsum;
    a.sumX += b.sumX;
    a.sumY += b.sumY;

    // numeric aggregations
    bKeys = Object.keys(b);
    for (var i = 0; i < bKeys.length; i++) {
        var aggKey = bKeys[i];
        if (
            aggKey == "count(*)" ||
            aggKey == "topk" ||
            aggKey == "convexHull" ||
            aggKey == "xysqrsum" ||
            aggKey == "sumX" ||
            aggKey == "sumY"
        )
            continue;
        if (!(aggKey in a)) {
            a[aggKey] = b[aggKey];
            continue;
        }
        var func = aggKey.substring(
            aggKey.lastIndexOf(aggKeyDelimiter) + aggKeyDelimiter.length,
            aggKey.lastIndexOf("(")
        );
        var aValue = a[aggKey],
            bValue = b[aggKey];
        switch (func) {
            case "count":
            case "sum":
            case "sqrsum":
                a[aggKey] = aValue + bValue;
                break;
            case "min":
                a[aggKey] = Math.min(aValue, bValue);
                break;
            case "max":
                a[aggKey] = Math.max(aValue, bValue);
                break;
        }
    }
}

/**
 * PLV8 function used by the SSVCitusIndexer for hierarchical clustering
 * @param clusters
 * @param ssv
 */
function singleNodeClustering(shard, ssv) {
    function initClusterAgg(d) {
        d.cluster_agg = JSON.parse(d.cluster_agg);
        ret = d.cluster_agg;
        if (Object.keys(ret).length > 1) {
            // not only count(*), and thus not bottom level
            // just scale the convex hull
            for (var i = 0; i < ret.convexHull.length; i++) {
                ret.convexHull[i][0] /= zoomFactor;
                ret.convexHull[i][1] /= zoomFactor;
            }
            return;
        }

        // convex hull
        ret.convexHull = [[d.cx, d.cy]];

        // topk
        if (topk > 0) {
            var dd = {};
            for (var i = 0; i < fields.length; i++) {
                if (
                    fields[i] == "hash_key" ||
                    fields[i] == "minx" ||
                    fields[i] == "miny" ||
                    fields[i] == "maxx" ||
                    fields[i] == "maxy" ||
                    fields[i] == "cluster_agg" ||
                    fields[i] == "cx" ||
                    fields[i] == "cy" ||
                    fields[i] == "centroid"
                )
                    continue;
                dd[fields[i]] = d[fields[i]];
            }
            ret.topk = [dd];
        } else ret.topk = [];

        // for NNM experiment
        ret.xysqrsum = d[xCol] * d[xCol] + d[yCol] * d[yCol];
        ret.sumX = +d[xCol];
        ret.sumY = +d[yCol];

        // numerical aggregations
        var dimStr = "";
        for (var i = 0; i < aggDimensionFields.length; i++)
            dimStr += (i > 0 ? aggKeyDelimiter : "") + d[aggDimensionFields[i]];
        // always calculate count(*)
        ret[dimStr + aggKeyDelimiter + "count(*)"] = 1;
        for (var i = 0; i < aggMeasureFields.length; i++) {
            var curField = aggMeasureFields[i];
            if (curField == "*") continue;
            var curValue = d[curField];
            ret[dimStr + aggKeyDelimiter + "sum(" + curField + ")"] = +curValue;
            ret[dimStr + aggKeyDelimiter + "max(" + curField + ")"] = +curValue;
            ret[dimStr + aggKeyDelimiter + "min(" + curField + ")"] = +curValue;
            ret[dimStr + aggKeyDelimiter + "sqrsum(" + curField + ")"] =
                curValue * curValue;
        }
    }

    // get d3
    if (!("d3" in plv8)) plv8.d3 = require("d3");
    var d3 = plv8.d3;

    // get merge cluster function
    if (!("mergeClusterAggs" in plv8))
        plv8.mergeClusterAggs = REPLACE_ME_merge_cluster_aggs;
    var mergeClusterAggs = plv8.mergeClusterAggs;

    // fetch in queries
    var xCol = ssv.xCol;
    var yCol = ssv.yCol;
    var zOrder = ssv.zOrder;
    var zCol = ssv.zCol;
    var fields = ssv.fields;
    var types = ssv.types;
    var sql =
        "SELECT * FROM " +
        shard +
        (zCol != "none" ? " ORDER BY " + zCol + " " + zOrder : "") +
        ";";
    var plan = plv8.prepare(sql);
    var cursor = plan.cursor();

    // initialize a quadtree for existing clusters
    var zoomFactor = ssv.zoomFactor;
    var theta = ssv.theta;
    var bboxH = ssv.bboxH,
        bboxW = ssv.bboxW;
    var topk = ssv.topk;
    var aggKeyDelimiter = ssv.aggKeyDelimiter;
    var aggDimensionFields = ssv.aggDimensionFields;
    var aggMeasureFields = ssv.aggMeasureFields;
    var qt = d3
        .quadtree()
        .x(function x(d) {
            return d.cx;
        })
        .y(function y(d) {
            return d.cy;
        });
    var cluster;
    //    var cnt = 0;
    while ((cluster = cursor.fetch())) {
        //        cnt ++;
        //        if (cnt % 1000 == 0)
        //            plv8.elog(NOTICE, cnt + " " + qt.size() + " " + qt.extent());

        cluster.cx /= zoomFactor;
        cluster.cy /= zoomFactor;
        initClusterAgg(cluster);

        var x0 = cluster.cx - bboxW,
            x3 = cluster.cx + bboxW;
        var y0 = cluster.cy - bboxH,
            y3 = cluster.cy + bboxH;
        var nn = null,
            minNcd = -1;
        qt.visit(function(node, x1, y1, x2, y2) {
            if (!node.length) {
                do {
                    var d = node.data;
                    var ncd = d3.max([
                        Math.abs(cluster.cx - d.cx) / bboxW,
                        Math.abs(cluster.cy - d.cy) / bboxH
                    ]);
                    if (ncd <= theta)
                        if (nn == null || ncd < minNcd)
                            (nn = d), (minNcd = ncd);
                } while ((node = node.next));
            }
            return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
        });

        if (nn != null)
            // merge cluster
            mergeClusterAggs(nn.cluster_agg, cluster.cluster_agg);
        else qt.add(cluster);
    }
    cursor.close();
    plan.free();
    plv8.elog(NOTICE, "QT TREE DONE!!!!");

    // use batch insert to put data into the correct table
    var newClusters = qt.data();
    var batchSize = 3000;
    var targetTable = ssv.tableMap[shard];
    sql = "";
    for (var i = 0; i < newClusters.length; i++) {
        if (i % batchSize == 0) {
            if (sql.length > 0) {
                // plv8.elog(NOTICE, sql.length);
                plv8.execute(sql);
            }
            sql = "INSERT INTO " + targetTable + "(";
            for (var j = 0; j < fields.length; j++)
                sql += (j > 0 ? ", " : "") + fields[j];
            sql += ") VALUES ";
        }
        sql += (i % batchSize > 0 ? ", " : "") + "(";
        for (var j = 0; j < fields.length; j++) {
            sql += j > 0 ? ", " : "";
            var curValue = newClusters[i][fields[j]];
            if (types[j] == "int4" || types[j] == "float4") sql += curValue;
            else {
                if (fields[j] == "cluster_agg")
                    curValue = JSON.stringify(curValue);
                if (typeof curValue == "string")
                    curValue = curValue.replace(/\'/g, "''");
                sql += "'" + curValue + "'::" + types[j];
            }
        }
        sql += ")";
    }
    if (sql.length > 0) plv8.execute(sql);

    var ret = newClusters.length;
    qt = null;
    newClusters = null;
    return ret;
}

function mergeClustersAlongSplits(clusters, ssv) {
    // get d3
    if (!("d3" in plv8)) plv8.d3 = require("d3");
    var d3 = plv8.d3;

    // get merge cluster function
    if (!("mergeClusterAggs" in plv8))
        plv8.mergeClusterAggs = REPLACE_ME_merge_cluster_aggs;
    var mergeClusterAggs = plv8.mergeClusterAggs;

    var theta = ssv.theta;
    var zCol = ssv.zCol;
    var zOrder = ssv.zOrder;
    var bboxW = ssv.bboxW;
    var bboxH = ssv.bboxH;
    var topk = ssv.topk;
    var dir = ssv.splitDir;
    var aggKeyDelimiter = ssv.aggKeyDelimiter;

    clusters.sort(function(a, b) {
        if (dir == "vertical") return a.cy - b.cy;
        else return a.cx - b.cx;
    });

    var res = [JSON.parse(JSON.stringify(clusters[0]))];
    for (var i = 1; i < clusters.length; i++) {
        var cur = clusters[i];
        var last = res[res.length - 1];
        var ncd = Math.max(
            Math.abs(last.cx - cur.cx) / bboxW,
            Math.abs(last.cy - cur.cy) / bboxH
        );
        if (ncd >= theta)
            // no conflict
            res.push(JSON.parse(JSON.stringify(cur)));
        else {
            // merge last and cur
            var lastClusterAgg = JSON.parse(last.cluster_agg);
            var curClusterAgg = JSON.parse(cur.cluster_agg);

            // merge according to importance order
            if (
                (zCol == "none" &&
                    lastClusterAgg["count(*)"] >= curClusterAgg["count(*)"]) ||
                (zCol != "none" &&
                    last[zCol] > cur[zCol] &&
                    zOrder == "desc") ||
                (zCol != "none" && last[zCol] < cur[zCol] && zOrder == "asc")
            ) {
                mergeClusterAggs(lastClusterAgg, curClusterAgg);
                last.cluster_agg = JSON.stringify(lastClusterAgg);
            } else {
                mergeClusterAggs(curClusterAgg, lastClusterAgg);
                cur.cluster_agg = JSON.stringify(curClusterAgg);
                res[res.length - 1] = JSON.parse(JSON.stringify(cur));
            }
        }
    }

    return res;
}

//define prototype
SSV.prototype = {
    getLayerRenderer,
    getAxesRenderer,
    getLegendRenderer,
    getMapRenderer
};

// exports
module.exports = {
    SSV,
    processClusterAgg
};
