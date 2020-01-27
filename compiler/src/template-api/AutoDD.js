const getBodyStringOfFunction = require("./Utilities").getBodyStringOfFunction;
const setPropertiesIfNotExists = require("./Utilities")
    .setPropertiesIfNotExists;
const parsePathIntoSegments = require("./Utilities").parsePathIntoSegments;
const translatePathSegments = require("./Utilities").translatePathSegments;
const serializePath = require("./Utilities").serializePath;
const aggKeyDelimiter = "__";

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
        "custom",
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
    if (!("aggregate" in args.marks.cluster))
        args.marks.cluster.aggregate = {dimensions: [], measures: []};
    if (!("dimensions" in args.marks.cluster.aggregate))
        args.marks.cluster.aggregate.dimensions = [];
    if (!("measures" in args.marks.cluster.aggregate))
        args.marks.cluster.aggregate.measures = [];

    // succinct object notation of the measures
    if (!("length" in args.marks.cluster.aggregate.measures)) {
        if (
            !("fields" in args.marks.cluster.aggregate.measures) ||
            !("function" in args.marks.cluster.aggregate.measures)
        )
            throw new Error(
                "Constructing AutoDD: fields or function not found" +
                    "in the object notation of args.marks.cluster.aggregate.measures."
            );
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

    /*********************
     * check required args
     *********************/
    var requiredArgs = [
        ["data", "query"],
        ["data", "db"],
        ["layout", "x", "field"],
        ["layout", "x", "extent"],
        ["layout", "y", "field"],
        ["layout", "y", "extent"],
        ["layout", "z", "field"],
        ["layout", "z", "order"]
    ];
    var requiredArgsTypes = [
        "string",
        "string",
        "string",
        "object",
        "string",
        "object",
        "string",
        "string"
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
        args.layout.x.extent != null &&
        (!Array.isArray(args.layout.x.extent) ||
            args.layout.x.extent.length != 2 ||
            typeof args.layout.x.extent[0] != "number" ||
            typeof args.layout.x.extent[1] != "number")
    )
        throw new Error("Constructing AutoDD: malformed x.extent");
    if (
        args.layout.y.extent != null &&
        (!Array.isArray(args.layout.y.extent) ||
            args.layout.y.extent.length != 2 ||
            typeof args.layout.y.extent[0] != "number" ||
            typeof args.layout.y.extent[1] != "number")
    )
        throw new Error("Constructing AutoDD: malformed y.extent");
    if (
        "axis" in args.marks &&
        (args.layout.x.extent == null || args.layout.y.extent == null)
    )
        throw new Error(
            "Constructing AutoDD: raw data domain needs to be specified for rendering an axis."
        );
    if (
        (args.layout.x.extent != null && args.layout.y.extent == null) ||
        (args.layout.x.extent == null && args.layout.y.extent != null)
    )
        throw new Error(
            "Constructing AutoDD: x extent and y extent must both be provided."
        );
    if (
        args.marks.cluster.mode == "custom" &&
        !("custom" in args.marks.cluster)
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
    if (
        (args.marks.cluster.mode == "radar" ||
            args.marks.cluster.mode == "circle" ||
            args.marks.cluster.mode == "custom") &&
        args.marks.cluster.aggregate.dimensions.length > 0
    )
        throw new Error(
            "Constructing AutoDD: dimension columns (args.marks.cluster.aggregate.dimensions) not allowed for the given cluster mode."
        );
    for (var i = 0; i < args.marks.cluster.aggregate.dimensions.length; i++) {
        if (!("field" in args.marks.cluster.aggregate.dimensions[i]))
            throw new Error(
                "Constructing AutoDD: field not found in aggregate dimensions."
            );
        if (!("domain" in args.marks.cluster.aggregate.dimensions[i]))
            throw new Error(
                "Constructing AutoDD: domain not found in aggregate dimensions."
            );
    }
    for (var i = 0; i < args.marks.cluster.aggregate.measures.length; i++) {
        if (!("field" in args.marks.cluster.aggregate.measures[i]))
            throw new Error(
                "Constructing AutoDD: field not found in aggregate measures."
            );
        if (!("function" in args.marks.cluster.aggregate.measures[i]))
            throw new Error(
                "Constructing AutoDD: function not found in aggregate measures."
            );
    }
    if (args.marks.cluster.mode == "radar")
        for (var i = 0; i < args.marks.cluster.aggregate.measures.length; i++)
            if (!("extent" in args.marks.cluster.aggregate.measures[i]))
                throw new Error(
                    "Constructing AutoDD: extent in aggregate measures required for radar charts."
                );
    if (
        args.marks.cluster.mode == "pie" &&
        args.marks.cluster.aggregate.measures.length != 1
    )
        throw new Error(
            "Constructing AutoDD: there must be exactly 1 aggregate measure for pie charts."
        );
    if ("rankList" in args.marks.hover) {
        if (!("mode" in args.marks.hover.rankList))
            throw new Error(
                "Constructing AutoDD: hover rankList mode (marks.hover.rankList.mode) is missing."
            );
        if (args.marks.hover.rankList.mode == "custom") {
            if (!("custom" in args.marks.hover.rankList))
                throw new Error(
                    "Constructing AutoDD: custom hover rankList renderer (marks.hover.rankList.custom) is missing."
                );
            if (typeof args.marks.hover.rankList.custom != "function")
                throw new Error(
                    "Constructing AutoDD: hover object renderer (marks.cluster.hover.rankList.custom) is not a function."
                );
            if (
                !("config" in args.marks.hover.rankList) ||
                !("bboxH" in args.marks.hover.rankList.config) ||
                !("bboxW" in args.marks.hover.rankList.config)
            )
                throw new Error(
                    "Constructing AutoDD: custom hover ranklist bounding box size missing."
                );
        }
        if (
            args.marks.hover.rankList.mode == "tabular" &&
            !("fields" in args.marks.hover.rankList)
        )
            throw new Error(
                "Constructing AutoDD: fields for tabular hover rankList (marks.hover.rankList.fields) is missing."
            );
    }
    if ("boundary" in args.marks.hover)
        if (
            !(args.marks.hover.boundary == "convexhull") &&
            !(args.marks.hover.boundary == "bbox")
        )
            throw new Error(
                "Constructing AutoDD: unrecognized hover boundary type " +
                    args.marks.hover.boundary
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
            radarRadius: 80,
            radarTicks: 5
        });
    if (args.marks.cluster.mode == "pie")
        setPropertiesIfNotExists(this.clusterParams, {
            pieInnerRadius: 1,
            pieOuterRadius: 80,
            pieCornerRadius: 5,
            padAngle: 0.05
        });

    /********************************
     * setting aggregation parameters
     ********************************/
    this.aggregateParams = {
        aggDimensions: args.marks.cluster.aggregate.dimensions,
        aggMeasures: args.marks.cluster.aggregate.measures
    };
    this.aggregateParams.aggDomain = [];
    // combinations of domain values from all columns
    var dimensions = args.marks.cluster.aggregate.dimensions;
    var pointers = [];
    for (var i = 0; i < dimensions.length; i++) pointers.push(0);
    while (true) {
        var curDomain = "";
        for (var i = 0; i < dimensions.length; i++) {
            if (i > 0) curDomain += aggKeyDelimiter;
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
        if ("config" in args.marks.hover.rankList)
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
        this.hoverParams.topk =
            "topk" in args.marks.hover.rankList
                ? args.marks.hover.rankList.topk
                : 1;

        // orientation of custom ranks
        this.hoverParams.hoverRankListOrientation =
            "orientation" in args.marks.hover.rankList
                ? args.marks.hover.rankList.orientation
                : "vertical";

        // less important cosmetic parameters are in marks.hover.rankList.config
        // and we set default values here if unspecified:
        setPropertiesIfNotExists(this.hoverParams, {
            // hoverTableCellWidth: 100  <-- change
            // hoverTableCellHeight: 50  <-- change
        });
    }
    if ("boundary" in args.marks.hover)
        this.hoverParams.hoverBoundary = args.marks.hover.boundary;
    this.topk = this.hoverParams.topk != null ? this.hoverParams.topk : 0;

    /***************************
     * setting legend parameters
     ***************************/
    // TODO: legend params for different templates
    this.legendParams = {};
    this.legendParams.legendTitle =
        "legendTitle" in args.config ? args.config.legendTitle : "Legend";
    if ("legendDomain" in args.config)
        this.legendParams.legendDomain = args.config.legendDomain;

    /****************
     * setting bboxes
     ****************/
    if (args.marks.cluster.mode == "custom") {
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
    this.xCol = args.layout.x.field;
    this.yCol = args.layout.y.field;
    this.zCol = args.layout.z.field;
    this.zOrder = args.layout.z.order;
    this.clusterMode = args.marks.cluster.mode;
    this.aggDimensionFields = [];
    for (var i = 0; i < this.aggregateParams.aggDimensions.length; i++)
        this.aggDimensionFields.push(
            this.aggregateParams.aggDimensions[i].field
        );
    this.aggMeasureFields = [];
    for (var i = 0; i < this.aggregateParams.aggMeasures.length; i++)
        this.aggMeasureFields.push(this.aggregateParams.aggMeasures[i].field);
    this.clusterCustomRenderer =
        "custom" in args.marks.cluster ? args.marks.cluster.custom : null;
    this.columnNames = "columnNames" in args.data ? args.data.columnNames : [];
    this.numLevels = "numLevels" in args.config ? args.config.numLevels : 10;
    this.topLevelWidth =
        "topLevelWidth" in args.config ? args.config.topLevelWidth : 1000;
    this.topLevelHeight =
        "topLevelHeight" in args.config ? args.config.topLevelHeight : 1000;
    this.zoomFactor = "zoomFactor" in args.config ? args.config.zoomFactor : 2;
    this.overlap =
        "overlap" in args.layout
            ? args.layout.overlap
            : this.clusterMode == "contour" || this.clusterMode == "heatmap"
            ? 0
            : 1;
    this.axis = "axis" in args.config ? args.config.axis : false;
    this.loX = args.layout.x.extent != null ? args.layout.x.extent[0] : null;
    this.loY = args.layout.y.extent != null ? args.layout.y.extent[0] : null;
    this.hiX = args.layout.x.extent != null ? args.layout.x.extent[1] : null;
    this.hiY = args.layout.y.extent != null ? args.layout.y.extent[1] : null;
    this.mergeClusterAggs = mergeClusterAggs.toString();
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

// get rendering function for an autodd layer based on cluster mode
function getLayerRenderer(level, autoDDArrayIndex) {
    function renderCircleBody() {
        var params = args.renderingParams;
        REPLACE_ME_processClusterAgg();
        var maxSize = params["REPLACE_ME_autoDDId" + "_maxWeight"];
        var circleSizeInterpolator = d3
            .scaleSqrt()
            .domain([1, maxSize])
            .range([params.circleMinSize, params.circleMaxSize]);
        var g = svg.append("g").classed("hovercircle", true);

        // filter
        var defs = g.append("defs");
        var filter = defs.append("filter").attr("id", "filter-demo-glow");
        var feGaussianBlur = filter
            .append("feGaussianBlur")
            .attr("stdDeviation", "2")
            .attr("result", "coloredBlur");
        var feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        g.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("r", function(d) {
                return circleSizeInterpolator(d.clusterAgg["count(*)"]);
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
            .style("filter", "url(#filter-demo-glow)")
            .style("pointer-events", "fill")
            .classed("kyrix-retainsizezoom", true);
        g.selectAll("text")
            .data(data)
            .enter()
            .append("text")
            .attr("dy", "0.3em")
            .text(function(d) {
                return params.toLargeNumberNotation(+d.clusterAgg["count(*)"]);
            })
            .attr("font-size", function(d) {
                return circleSizeInterpolator(d.clusterAgg["count(*)"]) / 2;
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
                    circleSizeInterpolator(d.clusterAgg["count(*)"]) * 1.5
                );
            });

        // for hover
        var hoverSelector = "circle";
    }

    function renderObjectClusterNumBody() {
        var g = svg.select("g:last-of-type");
        data.forEach(d => {
            d.clusterAgg = JSON.parse(d.clusterAgg);
        });
        g.selectAll(".clusternum")
            .data(data)
            .enter()
            .append("text")
            .text(function(d) {
                return args.renderingParams.toLargeNumberNotation(
                    +d.clusterAgg["count(*)"]
                );
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
            w: +JSON.parse(d.clusterAgg)["count(*)"]
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
        var aggKeyDelimiter = "REPLACE_ME_agg_key_delimiter";
        var g = svg.append("g");

        // Step 1: Pre-process clusterAgg
        REPLACE_ME_processClusterAgg();

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
                var curAggKey =
                    aggKeyDelimiter +
                    curMeasure.function +
                    "(" +
                    curMeasure.field +
                    ")";
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
                    return d.clusterAgg["count(*)"];
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
        var params = args.renderingParams;
        var aggKeyDelimiter = "REPLACE_ME_agg_key_delimiter";
        var parse = REPLACE_ME_parse_func;
        var translate = REPLACE_ME_translate_func;
        var serialize = REPLACE_ME_serialize_func;

        var g = svg.append("g");

        // Step 1: Pre-process clusterAgg
        REPLACE_ME_processClusterAgg();

        // Step 2: append pies
        var pie = d3.pie().value(function(d) {
            return d.value;
        });

        var aggKeys = [];
        for (var i = 0; i < params.aggDomain.length; i++)
            aggKeys.push(
                params.aggDomain[i] +
                    aggKeyDelimiter +
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
            .text(d => d.clusterAgg["count(*)"])
            .attr("x", d => +d.cx)
            .attr("y", d => +d.cy - params.pieOuterRadius)
            // .attr("dy", ".35em")
            .attr("font-size", params.pieOuterRadius / 2.5)
            .attr("text-anchor", "middle")
            .style("fill-opacity", 0.8)
            .style("fill", "grey")
            .style("pointer-events", "none")
            .classed("kyrix-retainsizezoom", true);

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

    function processClusterAgg() {
        function getConvexCoordinates(d) {
            var coords = d.clusterAgg.convexHull;
            if (typeof coords == "string") coords = JSON.parse(coords);
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
                        aggKeyDelimiter +
                        curFunc +
                        "(" +
                        curField +
                        ")";
                    if (!(curKey in d.clusterAgg)) {
                        switch (curFunc) {
                            case "count":
                            case "sum":
                            case "sqrsum":
                                d.clusterAgg[curKey] = 0;
                                break;
                            case "min":
                                d.clusterAgg[curKey] = Number.MIN_VALUE;
                                break;
                            case "max":
                                d.clusterAgg[curKey] = Number.MAX_VALUE;
                                break;
                            case "avg":
                                var sumKey =
                                    params.aggDomain[i] +
                                    aggKeyDelimiter +
                                    "sum(" +
                                    curField +
                                    ")";
                                var countKey =
                                    params.aggDomain[i] +
                                    aggKeyDelimiter +
                                    "count(*)";
                                if (
                                    !(sumKey in d.clusterAgg) ||
                                    !(countKey in d.clusterAgg)
                                )
                                    d.clusterAgg[curKey] = 0;
                                else
                                    d.clusterAgg[curKey] =
                                        d.clusterAgg[sumKey] /
                                        d.clusterAgg[countKey];
                                break;
                        }
                    }
                }
        });
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
                .attr("id", "autodd_boundary_hover")
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
            var params = args.renderingParams;
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
                for (var j = 0; j < data.length; j++)
                    maxlen = Math.max(
                        maxlen,
                        data[j][fields[i]].toString().length
                    );
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
                    var g = svg.append("g").attr("id", "autodd_ranklist_hover");
                    var topKData = d.clusterAgg.topk;
                    if (typeof topKData == "string")
                        topKData = JSON.parse(topKData);
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
                    d3.selectAll("#autodd_ranklist_hover").remove();
                });
        }

        // boundary
        if ("hoverBoundary" in params)
            g.selectAll(hoverSelector)
                .on("mouseover.boundary", function(d) {
                    var g = svg.append("g").attr("id", "autodd_boundary_hover");
                    if (params.hoverBoundary == "convexhull")
                        convexRenderer(g, d);
                    else if (params.hoverBoundary == "bbox") bboxRenderer(g, d);
                })
                .on("mouseleave.boundary", function() {
                    d3.selectAll("#autodd_boundary_hover").remove();
                });
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
    if (this.clusterMode == "custom") {
        renderFuncBody =
            "(" +
            this.clusterCustomRenderer.toString() +
            ")(svg, data, args);\n";
        if (this.clusterParams.clusterCount)
            renderFuncBody += getBodyStringOfFunction(
                renderObjectClusterNumBody
            );
    } else if (this.clusterMode == "circle") {
        // render circle
        renderFuncBody = getBodyStringOfFunction(renderCircleBody)
            .replace(
                /REPLACE_ME_processClusterAgg/g,
                "(" + processClusterAgg.toString() + ")"
            )
            .replace(/REPLACE_ME_autoDDId/g, autoDDArrayIndex + "_" + level);
        renderFuncBody += getBodyStringOfFunction(regularHoverBody);
    } else if (this.clusterMode == "contour") {
        renderFuncBody = getBodyStringOfFunction(renderContourBody).replace(
            /REPLACE_ME_radius/g,
            this.bboxH
        );
        renderFuncBody += getBodyStringOfFunction(KDEObjectHoverBody);
    } else if (this.clusterMode == "heatmap") {
        renderFuncBody = getBodyStringOfFunction(renderHeatmapBody).replace(
            /REPLACE_ME_autoDDId/g,
            autoDDArrayIndex + "_" + level
        );
        renderFuncBody += getBodyStringOfFunction(KDEObjectHoverBody);
    } else if (this.clusterMode == "radar") {
        renderFuncBody = getBodyStringOfFunction(renderRadarBody)
            .replace(
                /REPLACE_ME_processClusterAgg/g,
                "(" + processClusterAgg.toString() + ")"
            )
            .replace(/REPLACE_ME_agg_key_delimiter/g, aggKeyDelimiter);
        renderFuncBody += getBodyStringOfFunction(regularHoverBody);
    } else if (this.clusterMode == "pie") {
        renderFuncBody = getBodyStringOfFunction(renderPieBody)
            .replace(
                /REPLACE_ME_processClusterAgg/g,
                "(" + processClusterAgg.toString() + ")"
            )
            .replace(/REPLACE_ME_agg_key_delimiter/g, aggKeyDelimiter)
            .replace(/REPLACE_ME_parse_func/g, parsePathIntoSegments.toString())
            .replace(
                /REPLACE_ME_translate_func/g,
                translatePathSegments.toString()
            )
            .replace(/REPLACE_ME_serialize_func/g, serializePath.toString());
        renderFuncBody += getBodyStringOfFunction(regularHoverBody);
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
        /*        var stDate = new Date(0),
            enDate = new Date(0);
        stDate.setUTCSeconds(1356998400);
        enDate.setUTCSeconds(1425167999);
        var x = d3
            .scaleTime()
            .domain([stDate, enDate])
            .range([REPLACE_ME_xOffset, cWidth - REPLACE_ME_xOffset]);*/
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
            .domain(
                "legendDomain" in params
                    ? params.legendDomain
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
            .title(params.legendTitle)
            .labelOffset(15)
            //.titleWidth(200)
            // .labelAlign("start")
            .scale(color);

        svg.select(".legendOrdinal").call(legendOrdinal);
    }

    var renderFuncBody = "";
    if (this.clusterMode == "pie")
        renderFuncBody = getBodyStringOfFunction(pieLegendRendererBody);
    return new Function("svg", "data", "args", renderFuncBody);
}

/**
 * PLV8 function used by the AutoDDCitusIndexer to calculate Citus
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
 * PLV8 function used by the AutoDDCitusIndexer for hierarchical clustering
 * @param clusters
 * @param autodd
 */
function singleNodeClustering(shard, autodd) {
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
    var xCol = autodd.xCol;
    var yCol = autodd.yCol;
    var zOrder = autodd.zOrder;
    var zCol = autodd.zCol;
    var fields = autodd.fields;
    var types = autodd.types;
    var sql =
        "SELECT * FROM " +
        shard +
        (zCol != "none" ? " ORDER BY " + zCol + " " + zOrder : "") +
        ";";
    var plan = plv8.prepare(sql);
    var cursor = plan.cursor();

    // initialize a quadtree for existing clusters
    var zoomFactor = autodd.zoomFactor;
    var theta = autodd.theta;
    var bboxH = autodd.bboxH,
        bboxW = autodd.bboxW;
    var topk = autodd.topk;
    var aggKeyDelimiter = autodd.aggKeyDelimiter;
    var aggDimensionFields = autodd.aggDimensionFields;
    var aggMeasureFields = autodd.aggMeasureFields;
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
    var targetTable = autodd.tableMap[shard];
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

function mergeClustersAlongSplits(clusters, autodd) {
    // get d3
    if (!("d3" in plv8)) plv8.d3 = require("d3");
    var d3 = plv8.d3;

    // get merge cluster function
    if (!("mergeClusterAggs" in plv8))
        plv8.mergeClusterAggs = REPLACE_ME_merge_cluster_aggs;
    var mergeClusterAggs = plv8.mergeClusterAggs;

    var theta = autodd.theta;
    var zCol = autodd.zCol;
    var zOrder = autodd.zOrder;
    var bboxW = autodd.bboxW;
    var bboxH = autodd.bboxH;
    var topk = autodd.topk;
    var dir = autodd.splitDir;
    var aggKeyDelimiter = autodd.aggKeyDelimiter;

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
AutoDD.prototype = {
    getLayerRenderer,
    getAxesRenderer,
    getLegendRenderer
};

// exports
module.exports = {
    AutoDD
};
