const getBodyStringOfFunction = require("./Utilities").getBodyStringOfFunction;
const formatAjvErrorMessage = require("./Utilities").formatAjvErrorMessage;
const fs = require("fs");

function StaticAggregation(args_) {
    // verify against schema
    // defaults are assigned at the same time
    var args = JSON.parse(JSON.stringify(args_));
    var schema = JSON.parse(
        fs.readFileSync(
            "../../src/template-api/json-schema/StaticAggregation.json"
        )
    );
    var ajv = new require("ajv")({useDefaults: true});
    var validator = ajv.compile(schema);
    var valid = validator(args);
    if (!valid)
        throw new Error(
            "Constructing StaticAggregation: " +
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
    if (!("stackDimensions" in args.query)) args.query.stackDimensions = [];
    var allQueryFields = args.query.dimensions
        .concat(args.query.stackDimensions)
        .concat(args.query.sampleFields)
        .concat([args.query.measureCol]);
    var disjoint = true;
    for (var i = 0; i < allQueryFields.length; i++)
        for (var j = i + 1; j < allQueryFields.length; j++)
            if (allQueryFields[j] === allQueryFields[i]) disjoint = false;
    if (!disjoint)
        throw new Error(
            "Constructing StaticAggregation: query fields " +
                "(query.dimensions, query.stackDimensions, query.measure, query.sampleFields) have duplicates."
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
            "Constructing StaticAggregation: Tooltip columns and aliases should have the same length."
        );

    // columns in textFields must be from args.query.dimensions
    if ("textFields" in args)
        for (var i = 0; i < args.textFields.length; i++)
            if (args.query.dimensions.indexOf(args.textFields[i]) < 0)
                throw new Error(
                    "Constructing Static Aggregation: text field " +
                        args.textFields[i] +
                        " is not present in query.dimensions."
                );

    // default axis titles
    if (!("axis" in args)) args.axis = {};
    if (!("xTitle" in args.axis))
        args.axis.xTitle = args.query.dimensions.join(", ");
    if (!("yTitle" in args.axis)) args.axis.yTitle = args.query.measure;

    // get args into "this"
    var keys = Object.keys(args);
    for (var i = 0; i < keys.length; i++) this[keys[i]] = args[keys[i]];
}

function getRenderer(type) {
    var renderFuncBody;
    if (type == "pie")
        renderFuncBody = getBodyStringOfFunction(pieChartRenderer);
    else if (type == "treemap")
        renderFuncBody = getBodyStringOfFunction(treemapRenderer);
    else if (type == "circlePack")
        renderFuncBody = getBodyStringOfFunction(circlePackRenderer);
    else if (type == "bar")
        renderFuncBody = getBodyStringOfFunction(barChartRenderer);
    return new Function("svg", "data", "args", renderFuncBody);

    function pieChartRenderer(svg, data, args) {
        var g = svg.append("g");
        var rpKey =
            "staticAggregation_" +
            args.staticAggregationId.substring(
                0,
                args.staticAggregationId.indexOf("_")
            );
        var params = args.renderingParams[rpKey];

        // d3 pie
        var pie = d3.pie().value(function(d) {
            return +d.kyrixAggValue;
        });

        // d3 arc
        var arc = d3
            .arc()
            .innerRadius(params.innerRadius)
            .outerRadius(params.outerRadius)
            .cornerRadius(params.cornerRadius)
            .padAngle(params.padAngle);

        // d3 color scale
        var numCategories = Math.min(
            data.length,
            d3[params.colorScheme].length
        );
        var color = d3
            .scaleOrdinal()
            .domain(d3.range(0, numCategories))
            .range(d3[params.colorScheme]);

        // only draw numCategories pies
        var data = data
            .sort(function(a, b) {
                return b.kyrixAggValue - a.kyrixAggValue;
            })
            .slice(0, numCategories);
        var cooked = pie(data);
        cooked.forEach(function(d) {
            for (var key in d.data) d[key] = d.data[key];
            delete d.data;
            delete d.value;
        });

        var slices = g
            .selectAll("g")
            .data(cooked)
            .enter()
            .append("g");
        slices
            .append("path")
            .classed("value", true)
            .attr("fill", function(d) {
                return color(d.index);
            })
            .attr("d", arc)
            .attr(
                "transform",
                `translate(${args.viewportW / 2}, ${args.viewportH / 2})`
            );

        // legend
        g.append("g")
            .attr("class", "legendOrdinal")
            .attr("transform", "translate(50,50) scale(1.7)");

        var domains = cooked
            .map(function(d) {
                var dimValues = [];
                params.dimensions.forEach(function(p) {
                    dimValues.push(d[p]);
                });
                var dimStr = dimValues.join("__");
                if (dimStr in params.legendDomain)
                    dimStr = params.legendDomain[dimStr];
                return {index: d.index, domain: dimStr};
            })
            .sort(function(a, b) {
                return a.index - b.index;
            })
            .map(function(d) {
                return d.domain;
            });
        var color = d3
            .scaleOrdinal()
            .domain(domains)
            .range(d3[params.colorScheme]);

        var legendOrdinal = d3
            .legendColor()
            .shape("rect")
            //.orient("horizontal")
            .shapePadding(10)
            .title(params.legendTitle)
            .labelOffset(15)
            .scale(color);

        svg.select(".legendOrdinal").call(legendOrdinal);

        // transition
        if (!params.transition) return;

        var transitionParams = {
            duration: 1500,
            ease: "Cubic",
            gap: 0
        };
        slowIn();
        radiusShift();

        function slowIn() {
            var arc2degree = d3
                .scaleLinear()
                .domain([0, 2 * Math.PI])
                .range([0, 360]);
            slices.style("opacity", 0);

            slices.attr("transform", function(d) {
                var ret = "rotate(-" + arc2degree(d.startAngle) + ")";
                return ret;
            });
            slices
                .transition()
                .duration(transitionParams.duration)
                .ease(d3["ease" + transitionParams.ease])
                .attrTween("transform", function(d) {
                    return d3.interpolate(
                        "rotate(-" + arc2degree(d.startAngle) + ")",
                        "rotate(0)"
                    );
                })
                .style("opacity", 1)
                .on("end", function() {
                    setPizzaHover();
                });
        }

        function radiusShift() {
            var arc0 = arc.innerRadius(0).outerRadius(params.outerRadius);
            arc0.padAngle(params.padAngle);
            slices.select("path").attr("d", arc0);
            slices
                .select("path")
                .transition()
                .delay(1300)
                .duration(transitionParams.duration)
                .ease(d3["ease" + transitionParams.ease])
                .attrTween("d", function(d) {
                    var i = d3.interpolate(0, params.innerRadius);
                    return function(t) {
                        var r = i(t);
                        var arct = arc0.innerRadius(r);
                        return arct(d);
                    };
                });
        }

        function setPizzaHover() {
            slices
                .on("mouseover.pizza", function(d) {
                    d3.select(this)
                        .filter(function(d) {
                            return !d.pizzaFlag;
                        })
                        .transition()
                        .duration(500)
                        .ease(d3["ease" + transitionParams.ease])
                        .attr("transform", function(d) {
                            d.pizzaFlag = true;
                            return (
                                "translate(" +
                                arc.centroid(d).map(function(d) {
                                    return d * 0.1;
                                }) +
                                ")"
                            );
                        });
                })
                .on("mouseout.pizza", function(d) {
                    d3.select(this)
                        .filter(function(d) {
                            return d.pizzaFlag;
                        })
                        .transition()
                        .duration(100)
                        .ease(d3["ease" + transitionParams.ease])
                        .attr("transform", d => {
                            d.pizzaFlag = false;
                            return "";
                        });
                });
        }
    }

    function treemapRenderer(svg, data, args) {
        var g = svg.append("g");
        var rpKey =
            "staticAggregation_" +
            args.staticAggregationId.substring(
                0,
                args.staticAggregationId.indexOf("_")
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
        if (params.textFields.length > 0) {
            g.selectAll(".textfield")
                .data(rectData)
                .join("text")
                .classed("textfield", true)
                .text(function(d) {
                    return params.textFields
                        .map(function(p) {
                            return d[p];
                        })
                        .join(", ");
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
                    if (w > this.textContent.length * 11 && h > 40) return 1;
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
                                if (w > this.textContent.length * 11 && h > 40)
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
                                if (w > this.textContent.length * 11 && h > 40)
                                    return t;
                                else return 0;
                            });
                };
            });
    }

    function circlePackRenderer(svg, data, args) {
        var g = svg.append("g");
        var rpKey =
            "staticAggregation_" +
            args.staticAggregationId.substring(
                0,
                args.staticAggregationId.indexOf("_")
            );
        var params = args.renderingParams[rpKey];

        // construct data needed to pass in d3.pack
        var packData = {children: []};
        for (var i = 0; i < data.length; i++) packData.children.push(data[i]);

        // use d3.treemap to calculate coordinates
        var ysft = 80;
        var root = d3
            .pack()
            .size([args.viewportW, args.viewportH - ysft])
            .padding(3)(
            d3
                .hierarchy(packData)
                .sum(d => d.kyrixAggValue)
                .sort((a, b) => b.data.kyrixAggValue - a.data.kyrixAggValue)
        );

        // color scale
        var circles = root.leaves().map(d => +d.data.kyrixAggValue);
        var minArea = d3.min(circles);
        var maxArea = d3.max(circles);
        var color = d3
            .scaleSequential(d3[params.colorScheme])
            .domain([minArea, maxArea]);

        // draw rectangles
        var circleData = root.leaves().map(function(d) {
            var ret = Object.assign({}, d, d.data);
            delete ret.data;
            return ret;
        });

        g.selectAll(".packcircle")
            .data(circleData)
            .join("circle")
            .classed("packcircle", true)
            .attr("cx", function(d) {
                return d.x;
            })
            .attr("cy", function(d) {
                return d.y + ysft;
            })
            .attr("r", function(d) {
                if (params.transition) return 0;
                else return d.r;
            })
            .attr("fill", d => color(d.kyrixAggValue));

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

        // // rectangle text
        if (params.textFields.length > 0) {
            g.selectAll(".textfield")
                .data(circleData.slice(0, 10))
                .join("text")
                .classed("textfield", true)
                .text(function(d) {
                    return params.textFields
                        .map(function(p) {
                            return d[p];
                        })
                        .join(", ");
                })
                .attr("text-anchor", "middle")
                .attr("x", function(d) {
                    return d.x;
                })
                .attr("y", function(d) {
                    return d.y + d.r * 0.14 + ysft;
                })
                .attr("font-size", function(d) {
                    return d.r * 0.3;
                })
                .attr("fill", function(d) {
                    if (minArea == maxArea) return "#000";
                    if ((d.kyrixAggValue - minArea) / (maxArea - minArea) > 0.5)
                        return "#FFF";
                    return "#000";
                })
                .style("opacity", function(d) {
                    if (params.transition) return 0;
                    if (d.r * 2 > Math.max(this.textContent.length * 11, 40))
                        return 1;
                    else return 0;
                });
        }

        // transition
        if (!params.transition) return;

        g.selectAll(".packcircle")
            .transition()
            .duration(500)
            .attr("r", function(d) {
                return d.r;
            })
            .on("end", function(d, i) {
                if (i == 0)
                    g.selectAll(".textfield").style("opacity", function(p) {
                        if (
                            p.r * 2 >
                            Math.max(this.textContent.length * 11, 40)
                        )
                            return 1;
                        else return 0;
                    });
            });
    }

    function barChartRenderer(svg, data, args) {
        function dedupArray(x) {
            var ret = [];
            for (var i = 0; i < x.length; i++)
                if (ret.indexOf(x[i]) < 0) ret.push(x[i]);
            return ret;
        }

        var g = svg.append("g");
        var rpKey =
            "staticAggregation_" +
            args.staticAggregationId.substring(
                0,
                args.staticAggregationId.indexOf("_")
            );
        var params = args.renderingParams[rpKey];

        // get domains
        data.map(function(d) {
            d.majorDomain = params.dimensions
                .map(function(p) {
                    return d[p];
                })
                .join(", ");
            d.stackDomain = params.stackDimensions
                .map(function(p) {
                    return d[p];
                })
                .join(", ");
        });

        var majorDomains = dedupArray(
            data.map(function(d) {
                return d.majorDomain;
            })
        ).sort();
        var stackDomains = dedupArray(
            data.map(function(d) {
                return d.stackDomain;
            })
        ).sort();

        // x scale
        var vw = args.viewportW;
        var vh = args.viewportH;
        var marginLeft = 100;
        var marginTop = 150;
        var x = d3
            .scaleBand()
            .domain(majorDomains)
            .range([marginLeft, vw - marginLeft])
            .padding(0.4);

        // calculate margin bottom
        var marginBottom;
        var maxXLabelLength = d3.max(
            majorDomains.map(function(d) {
                return Math.min(d.length + 3, 21) * 10;
            })
        );
        var xLabelDirection =
            maxXLabelLength > x.bandwidth() ? "vertical" : "horizontal";
        if (xLabelDirection == "vertical") marginBottom = maxXLabelLength + 70;
        else marginBottom = 80;

        // y scale
        var y = d3
            .scaleLinear()
            .domain([
                0,
                d3.max(
                    majorDomains.map(function(d) {
                        return d3.sum(
                            data
                                .filter(function(p) {
                                    return p.majorDomain == d;
                                })
                                .map(function(p) {
                                    return p.kyrixAggValue;
                                })
                        );
                    })
                )
            ])
            .range([vh - marginBottom, marginTop]);

        // color scale
        var color = d3[params.colorScheme];

        // append rectangles
        for (var i = 0; i < majorDomains.length; i++) {
            var majorDomain = majorDomains[i];
            var dataItems = data.filter(function(d) {
                return d.majorDomain == majorDomain;
            });
            if (params.stackDimensions.length == 0) {
                var curHeight = y(+dataItems[0].kyrixAggValue);
                g.append("rect")
                    .datum(dataItems[0])
                    .classed("barrect", true)
                    .attr("x", x(majorDomain))
                    .attr(
                        "y",
                        params.transition ? vh - marginBottom : curHeight
                    )
                    .attr("width", x.bandwidth())
                    .attr(
                        "height",
                        params.transition ? 0 : vh - marginBottom - curHeight
                    )
                    .attr("fill", "#80b1d3");
            } else {
                var curH = 0;
                var totalH = d3.sum(
                    dataItems.map(function(d) {
                        return d.kyrixAggValue;
                    })
                );
                for (var j = 0; j < stackDomains.length; j++) {
                    var stackDomain = stackDomains[j];
                    var stackDataItems = dataItems.filter(function(d) {
                        return d.stackDomain == stackDomain;
                    });
                    if (stackDataItems.length == 0) continue;
                    var curAggValue = +stackDataItems[0].kyrixAggValue;
                    curH += curAggValue;
                    stackDataItems[0].kyrixBarCurH = curH;
                    stackDataItems[0].kyrixBarTotalH = totalH;
                    g.append("rect")
                        .datum(stackDataItems[0])
                        .classed("barrect", true)
                        .attr("x", x(majorDomain))
                        .attr(
                            "y",
                            params.transition ? y(curH - curAggValue) : y(curH)
                        )
                        .attr("width", x.bandwidth())
                        .attr(
                            "height",
                            params.transition
                                ? 0
                                : y(curH - curAggValue) - y(curH)
                        )
                        .attr(
                            "fill",
                            color[
                                stackDomains.indexOf(stackDomain) % color.length
                            ]
                        );
                }
            }
        }

        // x axis
        var xAxis = g
            .append("g")
            .attr("transform", `translate(0,${vh - marginBottom})`)
            .call(d3.axisBottom(x).tickSizeOuter(0))
            .call(g => g.selectAll(".domain").remove())
            .style("font-size", "20px");
        if (xLabelDirection == "vertical")
            xAxis
                .selectAll("text")
                .attr("y", 0)
                .attr("x", 9)
                .attr("dy", ".35em")
                .attr("transform", "rotate(90)")
                .style("text-anchor", "start")
                .text(function() {
                    var t = this.textContent;
                    if (t.length > 21) return t.substring(0, 18) + "...";
                    else return t;
                });
        xAxis
            .append("text")
            .text(params.xAxisTitle)
            .attr("fill", "black")
            .attr("text-anchor", "middle")
            .attr(
                "transform",
                `translate(${vw / 2}, ${
                    xLabelDirection == "vertical" ? maxXLabelLength + 50 : 60
                })`
            );

        // y axis
        g.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y).ticks(null, "s"))
            .call(g => g.selectAll(".domain").remove())
            .style("font-size", "20px")
            .append("text")
            .text(params.yAxisTitle)
            .attr("fill", "black")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(-60, ${vh / 2}) rotate(-90)`);

        // title
        g.append("text")
            .text(params.legendTitle)
            .style("font-size", 23)
            .style("font-size", 23)
            .attr("x", 15)
            .attr("y", 45);

        // legend
        if (params.stackDimensions.length > 0) {
            var cookedStackDomains = stackDomains.map(function(d) {
                if ([d] in params.legendDomain) return params.legendDomain[d];
                else return d;
            });
            var allColors = [];
            for (var i = 0; i < stackDomains.length; i++)
                allColors.push(color[i % color.length]);
            var colorScale = d3.scaleOrdinal(cookedStackDomains, allColors);
            var legendOrdinal = d3
                .legendColor()
                .shape("rect")
                .shapePadding(
                    d3.max(cookedStackDomains, function(d) {
                        return d.length;
                    }) * 8
                )
                .labelOffset(13)
                .orient("horizontal")
                .scale(colorScale);

            var legendG = g
                .append("g")
                .attr("transform", `translate(20, ${marginTop * 0.3})`);
            legendG
                .append("g")
                .attr("transform", "translate(0, 20) scale(1.3)")
                .call(legendOrdinal);
        }

        // transition
        if (params.transition) {
            if (params.stackDimensions.length == 0) {
                d3.selectAll(".barrect")
                    .transition()
                    .duration(800)
                    .attr("y", function(d) {
                        return y(d.kyrixAggValue);
                    })
                    .attr("height", function(d) {
                        return vh - marginBottom - y(d.kyrixAggValue);
                    });
            } else {
                d3.selectAll(".barrect")
                    .transition()
                    .ease(d3.easeLinear)
                    .delay(function(d) {
                        return (
                            ((d.kyrixBarCurH - d.kyrixAggValue) /
                                d.kyrixBarTotalH) *
                            800
                        );
                    })
                    .duration(function(d) {
                        return (d.kyrixAggValue / d.kyrixBarTotalH) * 800;
                    })
                    .attr("y", function(d) {
                        return y(d.kyrixBarCurH);
                    })
                    .attr("height", function(d) {
                        return (
                            y(d.kyrixBarCurH - d.kyrixAggValue) -
                            y(d.kyrixBarCurH)
                        );
                    });
            }
        }
    }
}

StaticAggregation.prototype = {
    getRenderer
};

module.exports = {
    StaticAggregation
};
