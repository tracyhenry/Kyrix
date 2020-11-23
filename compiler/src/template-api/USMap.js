const fs = require("fs");
const getBodyStringOfFunction = require("./Utilities").getBodyStringOfFunction;
const formatAjvErrorMessage = require("./Utilities").formatAjvErrorMessage;

/*
 * Constructor of a USMap
 * @param args
 * @constructor
 * by nyrret on 09/24/19
 */

function USMap(args_) {
    // verify against schema
    // defaults are assigned at the same time
    var args = JSON.parse(JSON.stringify(args_));
    var schema = JSON.parse(
        fs.readFileSync("../../src/template-api/json-schema/USMap.json")
    );
    var ajv = new require("ajv")({useDefaults: true});
    var validator = ajv.compile(schema);
    var valid = validator(args);
    if (!valid)
        throw new Error(
            "Constructing USMap: " + formatAjvErrorMessage(validator.errors[0])
        );

    // assign
    this.db = args.db;
    this.stateTable = args.state.table;
    this.stateRateCol = args.state.column;
    this.stateMapWidth = args.stateMapWidth;
    this.stateMapHeight = args.stateMapHeight;
    this.zoomFactor = args.zoomFactor;
    this.zoomType = args.zoomType;
    this.tooltipAlias = args.tooltipAlias;
    this.params = {
        colorScheme: args.colorScheme,
        projection: args.projection,
        legendTitle: args.legendTitle,
        stateColorCount: args.state.colorCount,
        stateRateRange: args.state.range,
        stateRateStep: args.state.step
    };
    if ("county" in args) {
        this.countyTable = args.county.table;
        this.countyRateCol = args.county.column;
        this.params = Object.assign({}, this.params, {
            countyColorCount: args.county.colorCount,
            countyRateRange: args.county.range,
            countyRateStep: args.county.step
        });
    }
}

function getUSMapTransformFunc(transformName) {
    //------------Transforms--------------------

    function stateMapTransformFunc(row, width, height) {
        var ret = [];

        var projectionStr = "REPLACE_ME_projection";
        var projection;
        if (projectionStr == "geoAlbersUsa") {
            projection = d3
                .geoAlbersUsa()
                .scale(width)
                .translate([width / 2, height / 2]);
        } else {
            projection = d3
                .geoMercator()
                .scale((((1 << 13) / Math.PI / 2) * width) / 2000)
                .center([-98.5, 39.5])
                .translate([width / 2, height / 2]);
        }

        var path = d3.geoPath().projection(projection);
        var feature = JSON.parse(row[2]);
        var centroid = path.centroid(feature);
        ret.push(!isFinite(centroid[0]) ? 0 : centroid[0]);
        ret.push(!isFinite(centroid[1]) ? 0 : centroid[1]);
        ret.push(row[0]);
        ret.push(row[1]);
        ret.push(row[2]);

        return Java.to(ret, "java.lang.String[]");
    }

    function countyMapStateBoundaryTransformFunc(row, width, height) {
        var ret = [];

        var projectionStr = "REPLACE_ME_projection";
        var projection;
        if (projectionStr == "geoAlbersUsa") {
            projection = d3
                .geoAlbersUsa()
                .scale(width)
                .translate([width / 2, height / 2]);
        } else {
            projection = d3
                .geoMercator()
                .scale((((1 << 13) / Math.PI / 2) * width) / 2000)
                .center([-98.5, 39.5])
                .translate([width / 2, height / 2]);
        }

        var path = d3.geoPath().projection(projection);
        var feature = JSON.parse(row[0]);
        var centroid = path.centroid(feature);
        var bounds = path.bounds(feature);
        ret.push(!isFinite(centroid[0]) ? 0 : centroid[0]);
        ret.push(!isFinite(centroid[1]) ? 0 : centroid[1]);
        ret.push(
            !isFinite(bounds[0][0]) || !isFinite(bounds[1][0])
                ? 0
                : bounds[1][0] - bounds[0][0]
        );
        ret.push(
            !isFinite(bounds[0][1]) || !isFinite(bounds[1][1])
                ? 0
                : bounds[1][1] - bounds[0][1]
        );
        ret.push(row[0]);

        return Java.to(ret, "java.lang.String[]");
    }

    function countyMapTransformFunc(row, width, height) {
        var ret = [];

        var projectionStr = "REPLACE_ME_projection";
        var projection;
        if (projectionStr == "geoAlbersUsa") {
            projection = d3
                .geoAlbersUsa()
                .scale(width)
                .translate([width / 2, height / 2]);
        } else {
            projection = d3
                .geoMercator()
                .scale((((1 << 13) / Math.PI / 2) * width) / 2000)
                .center([-98.5, 39.5])
                .translate([width / 2, height / 2]);
        }

        var path = d3.geoPath().projection(projection);
        var feature = JSON.parse(row[2]);
        var centroid = path.centroid(feature);
        var bounds = path.bounds(feature);
        ret.push(!isFinite(centroid[0]) ? 0 : centroid[0]);
        ret.push(!isFinite(centroid[1]) ? 0 : centroid[1]);
        ret.push(
            !isFinite(bounds[0][0]) || !isFinite(bounds[1][0])
                ? 0
                : bounds[1][0] - bounds[0][0]
        );
        ret.push(
            !isFinite(bounds[0][1]) || !isFinite(bounds[1][1])
                ? 0
                : bounds[1][1] - bounds[0][1]
        );
        for (var i = 0; i < 3; i++) ret.push(row[i]);

        return Java.to(ret, "java.lang.String[]");
    }

    //------------Choose Transform----------------
    var transform;
    switch (transformName) {
        case "stateMapTransform":
            transform = getBodyStringOfFunction(stateMapTransformFunc).replace(
                /REPLACE_ME_projection/g,
                this.params.projection
            );
            break;
        case "countyMapStateBoundaryTransform":
            transform = getBodyStringOfFunction(
                countyMapStateBoundaryTransformFunc
            ).replace(/REPLACE_ME_projection/g, this.params.projection);
            break;
        case "countyMapTransform":
            transform = getBodyStringOfFunction(countyMapTransformFunc).replace(
                /REPLACE_ME_projection/g,
                this.params.projection
            );
            break;
        default:
        // do nothing
    }

    return new Function("row", "width", "height", "param", transform);
}

// @param: specify name of renderer
function getUSMapRenderer(renderer) {
    // decide which renderer to use
    var renderFuncBody;
    switch (renderer) {
        case "stateMapRendering":
            renderFuncBody = getBodyStringOfFunction(stateMapRendering);
            break;
        case "stateMapLegendRendering":
            renderFuncBody = getBodyStringOfFunction(stateMapLegendRendering);
            break;
        case "countyMapStateBoundaryRendering":
            renderFuncBody = getBodyStringOfFunction(
                countyMapStateBoundaryRendering
            );
            break;
        case "countyMapLegendRendering":
            renderFuncBody = getBodyStringOfFunction(countyMapLegendRendering);
            break;
        case "countyMapRendering":
            renderFuncBody = getBodyStringOfFunction(countyMapRendering);
            break;
        default:
        // do nothing
    }

    return new Function("svg", "data", "args", renderFuncBody);

    // --------- Rendering Funcs ------------------
    function stateMapRendering(svg, data, args) {
        var g = svg.append("g");
        var width = args.canvasW,
            height = args.canvasH;
        var rpKey =
            "usmap_" + args.usmapId.substring(0, args.usmapId.indexOf("_"));
        var params = args.renderingParams[rpKey];

        // get projection
        var projection;
        if (params.projection == "geoAlbersUsa") {
            projection = d3
                .geoAlbersUsa()
                .scale(width)
                .translate([width / 2, height / 2]);
        } else {
            projection = d3
                .geoMercator()
                .scale((((1 << 13) / Math.PI / 2) * width) / 2000)
                .center([-98.5, 39.5])
                .translate([width / 2, height / 2]);
        }
        var path = d3.geoPath().projection(projection);

        // get scale threshold domain
        var lo = params.stateRateRange[0];
        var hi = params.stateRateRange[1];
        var step;
        if (params.stateRateStep > 0) step = params.stateRateStep;
        else step = (hi - lo) / params.stateColorCount;
        var scaleDomain = [lo];
        while (scaleDomain.length < params.stateColorCount) {
            var last = scaleDomain[scaleDomain.length - 1];
            last += step;
            if (last > hi) break;
            scaleDomain.push(last);
        }

        var color = d3
            .scaleThreshold()
            .domain(scaleDomain)
            .range(d3[params.colorScheme][scaleDomain.length + 1]);

        g.selectAll("path")
            .data(data)
            .enter()
            .append("path")
            .attr("d", function(d) {
                var feature = JSON.parse(d.geomstr);
                return path(feature);
            })
            .style("stroke", "#fff")
            .style("stroke-width", "0.5")
            .style("fill", function(d) {
                return color(d.rate);
            });
    }

    function stateMapLegendRendering(svg, data, args) {
        // parameters
        var rpKey =
            "usmap_" + args.usmapId.substring(0, args.usmapId.indexOf("_"));
        var params = args.renderingParams[rpKey];

        var bkgRectHeight = 80;
        var bkgRectXOffset = 50;
        var legendRectY = 32;
        var legendRectWidth = 60;
        var legendRectHeight = 16;
        var captionY = 20;
        var captionFontSize = 22;
        var tickFontSize = 12;

        var g = svg.append("g");
        var width = args.viewportW;

        // get scale threshold domain
        var lo = params.stateRateRange[0];
        var hi = params.stateRateRange[1];
        var step;
        if (params.stateRateStep > 0) step = params.stateRateStep;
        else step = (hi - lo) / params.stateColorCount;
        var scaleDomain = [lo];
        while (scaleDomain.length < params.stateColorCount) {
            var last = scaleDomain[scaleDomain.length - 1];
            last += step;
            if (last > hi) break;
            scaleDomain.push(last);
        }

        var color = d3
            .scaleThreshold()
            .domain(scaleDomain)
            .range(d3[params.colorScheme][scaleDomain.length + 1]);

        var bkgRectWidth = 570 + (scaleDomain.length - 7) * 60;
        var legendRectStartXOffset = bkgRectWidth + bkgRectXOffset - 60;
        g.append("rect")
            .attr("x", width - bkgRectWidth - bkgRectXOffset)
            .attr("y", 0)
            .attr("width", bkgRectWidth)
            .attr("height", bkgRectHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", "#fff");

        g.selectAll(".legendrect")
            .data(color.range().slice(1))
            .enter()
            .append("rect")
            .attr("x", function(d, i) {
                return width - legendRectStartXOffset + i * legendRectWidth;
            })
            .attr("y", legendRectY)
            .attr("width", legendRectWidth)
            .attr("height", legendRectHeight)
            .attr("fill", function(d) {
                return d;
            });

        // legend title
        g.append("text")
            .attr("x", width - bkgRectWidth - bkgRectXOffset + 10)
            .attr("y", captionY)
            .attr("fill", "#000")
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .attr("font-size", captionFontSize)
            .text(params.legendTitle);

        // axis ticks
        var axisScale = d3
            .scaleLinear()
            .domain([lo, scaleDomain[scaleDomain.length - 1]])
            .range([
                width - legendRectStartXOffset,
                width -
                    legendRectStartXOffset +
                    (scaleDomain.length - 1) * legendRectWidth
            ]);
        var axis = g
            .append("g")
            .attr("transform", "translate(0, " + legendRectY + ")")
            .call(
                d3
                    .axisBottom(axisScale)
                    .tickSize(23)
                    .tickValues(color.domain())
            );
        axis.style("font-size", tickFontSize);
        axis.select(".domain").remove();
    }

    function countyMapStateBoundaryRendering(svg, data, args) {
        g = svg.append("g");
        var width = args.canvasW,
            height = args.canvasH;
        var rpKey =
            "usmap_" + args.usmapId.substring(0, args.usmapId.indexOf("_"));
        var params = args.renderingParams[rpKey];

        // get projection
        var projection;
        if (params.projection == "geoAlbersUsa") {
            projection = d3
                .geoAlbersUsa()
                .scale(width)
                .translate([width / 2, height / 2]);
        } else {
            projection = d3
                .geoMercator()
                .scale((((1 << 13) / Math.PI / 2) * width) / 2000)
                .center([-98.5, 39.5])
                .translate([width / 2, height / 2]);
        }
        var path = d3.geoPath().projection(projection);

        g.selectAll("path")
            .data(data)
            .enter()
            .append("path")
            .attr("d", function(d) {
                var feature = JSON.parse(d.geomstr);
                return path(feature);
            })
            .style("stroke", "#fff")
            .style("stroke-width", "4")
            .style("fill", "none");
    }

    function countyMapLegendRendering(svg, data, args) {
        // parameters
        var rpKey =
            "usmap_" + args.usmapId.substring(0, args.usmapId.indexOf("_"));
        var params = args.renderingParams[rpKey];

        var bkgRectHeight = 80;
        var bkgRectXOffset = 50;
        var legendRectY = 32;
        var legendRectWidth = 60;
        var legendRectHeight = 16;
        var captionY = 20;
        var captionFontSize = 22;
        var tickFontSize = 12;

        var g = svg.append("g");
        var width = args.viewportW;

        // get scale threshold domain
        var lo = params.countyRateRange[0];
        var hi = params.countyRateRange[1];
        var step;
        if (params.countyRateStep > 0) step = params.countyRateStep;
        else step = (hi - lo) / params.countyColorCount;
        var scaleDomain = [lo];
        while (scaleDomain.length < params.countyColorCount) {
            var last = scaleDomain[scaleDomain.length - 1];
            last += step;
            if (last > hi) break;
            scaleDomain.push(last);
        }
        var color = d3
            .scaleThreshold()
            .domain(scaleDomain)
            .range(d3[params.colorScheme][scaleDomain.length + 1]);

        // append a background rectangle
        var bkgRectWidth = 570 + (scaleDomain.length - 7) * 60;
        var legendRectStartXOffset = bkgRectWidth + bkgRectXOffset - 60;
        g.append("rect")
            .attr("x", width - bkgRectWidth - bkgRectXOffset)
            .attr("y", 0)
            .attr("width", bkgRectWidth)
            .attr("height", bkgRectHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", "#fff");

        g.selectAll(".legendrect")
            .data(color.range().slice(1))
            .enter()
            .append("rect")
            .attr("x", function(d, i) {
                return width - legendRectStartXOffset + i * legendRectWidth;
            })
            .attr("y", legendRectY)
            .attr("width", legendRectWidth)
            .attr("height", legendRectHeight)
            .attr("fill", function(d) {
                return d;
            });

        // legend title
        g.append("text")
            .attr("x", width - bkgRectWidth - bkgRectXOffset + 10)
            .attr("y", captionY)
            .attr("fill", "#000")
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .attr("font-size", captionFontSize)
            .text(params.legendTitle);

        // axis ticks
        var axisScale = d3
            .scaleLinear()
            .domain([lo, scaleDomain[scaleDomain.length - 1]])
            .rangeRound([
                width - legendRectStartXOffset,
                width -
                    legendRectStartXOffset +
                    (scaleDomain.length - 1) * legendRectWidth
            ]);
        var axis = g
            .append("g")
            .attr("transform", "translate(0, " + legendRectY + ")")
            .call(
                d3
                    .axisBottom(axisScale)
                    .tickSize(23)
                    .tickValues(color.domain())
            );
        axis.style("font-size", tickFontSize);
        axis.select(".domain").remove();
    }

    function countyMapRendering(svg, data, args) {
        g = svg.append("g");
        var width = args.canvasW,
            height = args.canvasH;
        var rpKey =
            "usmap_" + args.usmapId.substring(0, args.usmapId.indexOf("_"));
        var params = args.renderingParams[rpKey];

        // get projection
        var projection;
        if (params.projection == "geoAlbersUsa") {
            projection = d3
                .geoAlbersUsa()
                .scale(width)
                .translate([width / 2, height / 2]);
        } else {
            projection = d3
                .geoMercator()
                .scale((((1 << 13) / Math.PI / 2) * width) / 2000)
                .center([-98.5, 39.5])
                .translate([width / 2, height / 2]);
        }
        var path = d3.geoPath().projection(projection);

        // get scale threshold domain
        var lo = params.countyRateRange[0];
        var hi = params.countyRateRange[1];
        var step;
        if (params.countyRateStep > 0) step = params.countyRateStep;
        else step = (hi - lo) / params.countyColorCount;
        var scaleDomain = [lo];
        while (scaleDomain.length < params.countyColorCount) {
            var last = scaleDomain[scaleDomain.length - 1];
            last += step;
            if (last > hi) break;
            scaleDomain.push(last);
        }

        var color = d3
            .scaleThreshold()
            .domain(scaleDomain)
            .range(d3[params.colorScheme][scaleDomain.length + 1]);

        g.selectAll("path")
            .data(data)
            .enter()
            .append("path")
            .attr("d", function(d) {
                var feature = JSON.parse(d.geomstr);
                return path(feature);
            })
            .style("stroke", "#fff")
            .style("stroke-width", "0.5")
            .style("fill", function(d) {
                return color(d.rate);
            });
    }
}

USMap.prototype = {
    getUSMapTransformFunc,
    getUSMapRenderer
};

module.exports = {
    USMap
};
