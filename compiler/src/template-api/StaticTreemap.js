const getBodyStringOfFunction = require("./Utilities").getBodyStringOfFunction;
const formatAjvErrorMessage = require("./Utilities").formatAjvErrorMessage;
const fs = require("fs");

function StaticTreemap(args_) {
    // verify against schema
    // defaults are assigned at the same time
    var args = JSON.parse(JSON.stringify(args_));
    var schema = JSON.parse(
        fs.readFileSync("../../src/template-api/json-schema/StaticTreemap.json")
    );
    var ajv = new require("ajv")({useDefaults: true});
    var validator = ajv.compile(schema);
    var valid = validator(args);
    if (!valid)
        throw new Error(
            "Constructing Static Treemap: " +
                formatAjvErrorMessage(validator.errors[0])
        );

    // check constraints/add defaults that can't be expressed by json-schema
    // extract measureCol and measureFunc from args.query.measure
    var pos = args.query.measure.indexOf("(");
    args.query.measureCol = args.query.measure.substring(
        pos + 1,
        args.query.measure.length - 1
    );
    args.query.measureFunc = args.query.measure.substring(0, pos);

    // check that query.dimensions, query.measure and query.sampleFields are disjoint
    var allQueryFields = args.query.dimensions
        .concat(args.query.sampleFields)
        .concat([args.query.measureCol]);
    var disjoint = true;
    for (var i = 0; i < allQueryFields.length; i++)
        for (var j = i + 1; j < allQueryFields.length; j++)
            if (allQueryFields[j] === allQueryFields[i]) disjoint = false;
    if (!disjoint)
        throw new Error(
            "Constructing Static Treemap: query fields " +
                "(query.dimensions, query.measure, query.sampleFields) have duplicates."
        );

    // add default tooltip columns and measures, which is the union of
    // query dimensions and measure
    if (!("tooltip" in args))
        args.tooltip = {
            columns: args.query.dimensions.concat(["kyrixAggValue"]),
            aliases: args.query.dimensions.concat([args.query.measure])
        };

    // tooltip column and aliases must have the same length
    if (args.tooltip.columns.length !== args.tooltip.aliases.length)
        throw new Error(
            "Constructing Static Treemap: Tooltip columns and aliases should have the same length."
        );

    // get args into "this"
    var keys = Object.keys(args);
    for (var i = 0; i < keys.length; i++) this[keys[i]] = args[keys[i]];
}

function getStaticTreemapRenderer() {
    var renderFuncBody = getBodyStringOfFunction(renderer);
    return new Function("svg", "data", "args", renderFuncBody);

    function renderer(svg, data, args) {
        var g = svg.append("g");
        var rpKey =
            "staticTreemap_" +
            args.staticTreemapId.substring(
                0,
                args.staticTreemapId.indexOf("_")
            );
        var params = args.renderingParams[rpKey];

        // construct data needed to pass in d3.treemap
        var treemapData = {children: []};
        for (var i = 0; i < data.length; i++)
            treemapData.children.push(data[i]);

        // use d3.treemap to calculate coordinates
        var ysft = 80;
        var root = d3
            .treemap()
            .size([args.viewportW, args.viewportH - ysft])
            .padding(params.padding)
            .round(true)(
            d3
                .hierarchy(treemapData)
                .sum(d => d.kyrixAggValue)
                .sort((a, b) => b.data.kyrixAggValue - a.data.kyrixAggValue)
        );

        // color scale
        var areas = root.leaves().map(d => +d.data.kyrixAggValue);
        var minArea = d3.min(areas);
        var maxArea = d3.max(areas);
        var color = d3
            .scaleSequential(d3[params.colorScheme])
            .domain([minArea, maxArea]);

        // draw rectangles
        var rectData = root.leaves().map(function(d) {
            var ret = Object.assign({}, d, d.data);
            delete ret.data;
            return ret;
        });
        var g = svg.append("g");
        g.selectAll(".treemaprect")
            .data(rectData)
            .join("rect")
            .classed("treemaprect", true)
            .attr("x", d => d.x0)
            .attr("y", d => d.y0 + ysft)
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => color(d.kyrixAggValue))
            .style("opacity", params.transition ? 0 : 1);

        // title
        g.append("text")
            .text(params.legendTitle)
            .style("font-size", 23)
            .attr("x", 15)
            .attr("y", 45);

        // legend
        var tickSize = 6;
        var width = 320;
        var height = 50 + tickSize;
        var marginTop = 18,
            marginRight = 0;
        var marginBottom = 16 + tickSize,
            marginLeft = 0;
        var ticks = width / 64;
        var ramp = function(color, n = 256) {
            const canvas = document.createElement("canvas");
            canvas.width = n;
            canvas.height = 1;
            const context = canvas.getContext("2d");
            for (var i = 0; i < n; ++i) {
                context.fillStyle = color(i / (n - 1));
                context.fillRect(i, 0, 1, 1);
            }
            return canvas;
        };
        var tickAdjust = g =>
            g
                .selectAll(".tick line")
                .attr("y1", marginTop + marginBottom - height);
        var x = Object.assign(
            color
                .copy()
                .interpolator(
                    d3.interpolateRound(marginLeft, width - marginRight)
                ),
            {
                range() {
                    return [marginLeft, width - marginRight];
                }
            }
        );
        g.append("g")
            .attr("transform", `translate(${args.viewportW - width - 70}, 15)`)
            .append("image")
            .attr("x", marginLeft)
            .attr("y", marginTop)
            .attr("width", width - marginLeft - marginRight)
            .attr("height", height - marginTop - marginBottom)
            .attr("preserveAspectRatio", "none")
            .attr("xlink:href", ramp(color.interpolator()).toDataURL());
        var tickValues, tickFormat;
        if (!x.ticks) {
            const n = Math.round(ticks + 1);
            tickValues = d3
                .range(n)
                .map(i => d3.quantile(color.domain(), i / (n - 1)));
            tickFormat = d3.format(",f");
        }

        // legend ticks
        g.append("g")
            .attr(
                "transform",
                `translate(${args.viewportW - width - 70},${height -
                    marginBottom +
                    15})`
            )
            .call(
                d3
                    .axisBottom(x)
                    .ticks(ticks, tickFormat)
                    .tickFormat(tickFormat)
                    .tickSize(tickSize)
                    .tickValues(tickValues)
            )
            .call(tickAdjust)
            .call(g => g.select(".domain").remove());

        // rectangle text
        if (params.textField.length > 0) {
            g.selectAll(".textfield")
                .data(rectData)
                .join("text")
                .classed("textfield", true)
                .text(function(d) {
                    return d[params.textField];
                })
                .attr("text-anchor", "left")
                .attr("x", function(d) {
                    return d.x0 + 10;
                })
                .attr("y", function(d) {
                    return d.y0 + 30 + ysft;
                })
                .attr("font-size", 15)
                .attr("fill", function(d) {
                    if (minArea == maxArea) return "#000";
                    if ((d.kyrixAggValue - minArea) / (maxArea - minArea) > 0.5)
                        return "#FFF";
                    return "#000";
                })
                .style("opacity", function(d) {
                    if (params.transition) return 0;
                    var w = d.x1 - d.x0;
                    var h = d.y1 - d.y0;
                    if (w > d[params.textField].length * 11 && h > 40) return 1;
                    else return 0;
                });
        }

        // transition
        if (!params.transition) return;

        // use DP to calculate a minimum enter time for each rectangle
        var dp = [];
        for (var i = 0; i < rectData.length; i++) {
            var minOrder = 0;
            for (var j = 0; j < dp.length; j++)
                if (
                    (rectData[j].y1 + params.padding === rectData[i].y0 &&
                        rectData[j].x1 > rectData[i].x0 &&
                        rectData[j].x0 < rectData[i].x1) ||
                    (rectData[j].x1 + params.padding === rectData[i].x0 &&
                        rectData[j].y1 > rectData[i].y0 &&
                        rectData[j].y0 < rectData[j].y1)
                )
                    minOrder = Math.max(minOrder, dp[j] + 1);
            dp.push(minOrder);
        }
        var maxOrder = d3.max(dp);
        var enterTime = 300;
        var transitionEndTime = 2000;
        var delayTime = (transitionEndTime - enterTime) / maxOrder;

        // animate rects
        g.selectAll(".treemaprect")
            .transition()
            .delay(function(d, i) {
                return dp[i] * delayTime;
            })
            .ease(d3.easeExpOut)
            .duration(enterTime)
            .tween("enter", function(d, i) {
                var x0 = d.x0;
                var y0 = d.y0;
                return function(t) {
                    if (i % 2 == 0)
                        d3.select(this)
                            .attr("x", x0 + (1 - t) * args.viewportW)
                            .style("opacity", t);
                    else
                        d3.select(this)
                            .attr("y", y0 + ysft + (1 - t) * args.viewportH)
                            .style("opacity", t);
                };
            });

        // animate texts
        g.selectAll(".textfield")
            .transition()
            .delay(function(d, i) {
                return dp[i] * delayTime;
            })
            .ease(d3.easeExpOut)
            .duration(enterTime)
            .tween("enter", function(d, i) {
                var x0 = d.x0;
                var y0 = d.y0;
                return function(t) {
                    if (i % 2 == 0)
                        d3.select(this)
                            .attr("x", x0 + 10 + (1 - t) * args.viewportW)
                            .style("opacity", function(d) {
                                var w = d.x1 - d.x0;
                                var h = d.y1 - d.y0;
                                if (
                                    w > d[params.textField].length * 11 &&
                                    h > 40
                                )
                                    return t;
                                else return 0;
                            });
                    else
                        d3.select(this)
                            .attr(
                                "y",
                                y0 + 30 + ysft + (1 - t) * args.viewportH
                            )
                            .style("opacity", function(d) {
                                var w = d.x1 - d.x0;
                                var h = d.y1 - d.y0;
                                if (
                                    w > d[params.textField].length * 11 &&
                                    h > 40
                                )
                                    return t;
                                else return 0;
                            });
                };
            });
    }
}

StaticTreemap.prototype = {
    getStaticTreemapRenderer
};

module.exports = {
    StaticTreemap
};
