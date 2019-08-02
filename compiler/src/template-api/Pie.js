const Transform = require("../Transform").Transform;
const Layer = require("../Layer").Layer;
/*
 * Constructor of a pie / doughnut
 * @param args
 * @constructor
 * by xinli on 07/22/19
 */
function Pie(args) {
    args = args || {};

    // check required args
    var requiredArgs = ["name", "db", "table", "value"];
    var requiredArgsTypes = ["string", "string", "string", "string"];
    for (var i = 0; i < requiredArgs.length; i++) {
        if (!(requiredArgs[i] in args))
            throw new Error(
                "Constructing Pie: " + requiredArgs[i] + " missing."
            );
        if (typeof args[requiredArgs[i]] !== requiredArgsTypes[i])
            throw new Error(
                "Constructing Pie: " +
                    requiredArgs[i] +
                    " must be " +
                    requiredArgsTypes[i] +
                    "."
            );
        if (requiredArgsTypes[i] == "string")
            if (args[requiredArgs[i]].length == 0)
                throw new Error(
                    "Constructing Pie: " +
                        requiredArgs[i] +
                        " cannot be an empty string."
                );
    }

    var reg = /^[a-zA-Z\$_][a-zA-Z\d_]*$/;
    if (!reg.test(args.name)) {
        throw new Error("Name of a pie should be a legal variable name");
    }
    var pie_name = args.name + "_pie_kyrix";

    var query = genQuery();

    var transform_func = getPieTransformFunc(pie_name);

    args.indices = args.indices || [];
    var schema = args.indices.concat(["value", "label"]);

    // console.log("schema:", schema);

    var transform = new Transform(query, args.db, transform_func, schema, true);

    // Pie is a dynamic layer
    Layer.call(this, transform, false);

    this.cx = args.cx || 300;
    this.cy = args.cy || 300;
    this.innerRadius = args.innerRadius || 0.01;
    this.outerRadius = args.outerRadius || 200;

    this.renderingParams = {
        [pie_name]: {
            cx: this.cx,
            cy: this.cy,
            innerRadius: this.innerRadius,
            outerRadius: this.outerRadius,
            colorInterpolator: args.colorInterpolator || "Viridis",
            labelShow: args.labelShow || false,
            labelRadius: args.labelRadius || -1,
            valueShow: args.valueShow || false,
            valueRadius: args.valueRadius || -1,
            percentageShow: args.percentageShow || false,
            percentageRadius: args.percentageRadius || -1,
            panelPercentage: args.panelPercentage || -1,
            cornerRadius: args.cornerRadius || 0,
            padAngle: args.padAngle || 0,
            transitions: args.transitions || [],
            indices: args.indices || []
        }
    };

    var piePlacement = {
        centroid_x: "con:" + this.cx,
        centroid_y: "con:" + this.cy,
        width: "con:" + this.outerRadius,
        height: "con:" + this.outerRadius
    };

    this.addPlacement(piePlacement);

    var rendering_func = getPieRenderer(pie_name);

    this.addRenderingFunc(rendering_func);

    function genQuery() {
        var ret = "select ";
        if ("indices" in args) {
            for (var index in args.indices) {
                ret += args.indices[index] + ", ";
            }
        }
        ret += args.value + ", ";
        if ("label" in args) {
            ret += args.label + " ";
        } else {
            ret += "row_number() over(";
            if (args.order_by) {
                ret += " order by ";
                ret += args.order_by;
                if (args.order == ("asc" || "ASC")) {
                    ret += " asc ) as rn_kyrix";
                } else if (args.order == ("desc" || "DESC") || !args.order) {
                    ret += " desc ) as rn_kyrix";
                } else {
                    throw new Error("unknown order");
                }
            } else {
                ret += ")";
            }
        }
        ret += " from ";
        ret += args.table;
        ret += ";";
        return ret;
    }
}
(function() {
    // create a class with no instance method
    var Super = function() {};
    Super.prototype = Layer.prototype;
    // use its instance as the prototype of Pie
    Pie.prototype = new Super();
})();

function getPieTransformFunc(pie_name) {
    transformFuncBody = getBodyStringOfFunction(transform_function);
    transformFuncBody = transformFuncBody.replace(/REPLACE_ME_name/g, pie_name);

    return new Function(
        "row",
        "w_canvas",
        "h_canvas",
        "renderParams",
        transformFuncBody
    );

    function transform_function(row, w_canvas, h_canvas, renderParams) {
        var ret = [];
        // row: value, (label),  rn_kyrix
        var args = renderParams["REPLACE_ME_name"];
        for (var i = 0; i < row.length; i++) {
            ret.push(row[i]);
        }
        return Java.to(ret, "java.lang.String[]");
    }
}

function getPieRenderer(pie_name) {
    renderFuncBody = getBodyStringOfFunction(renderer);
    renderFuncBody = renderFuncBody.replace(/REPLACE_ME_name/g, pie_name);

    return new Function("svg", "data", "rend_args", renderFuncBody);

    function renderer(svg, data, rend_args) {
        var params = rend_args.renderingParams["REPLACE_ME_name"];
        var extent = d3.extent(
            d3.values(
                data.map(function(d) {
                    return +d.value;
                })
            )
        );
        var color = d3
            .scaleSequential(d3["interpolate" + params.colorInterpolator])
            .domain(extent);
        var pie = d3.pie().value(function(d) {
            return d.value;
        });

        var cooked = pie(data);
        // console.log("cooked: ", cooked);

        var scalePercent = d3
            .scaleLinear()
            .domain([0, 2 * Math.PI])
            .range([0, 1]);
        var formatter = d3.format(".1%");
        cooked.forEach(entry => {
            entry.percentage = formatter(
                scalePercent(entry.endAngle - entry.startAngle)
            );
            for (x in entry.data) {
                entry[x] = entry.data[x];
            }
            delete entry.data;
        });

        var g = svg.append("g").attr("class", "gPie");

        g.attr("transform", function() {
            return "translate(" + params.cx + ", " + params.cy + " ) ";
        });

        var arc = d3
            .arc()
            .innerRadius(params.innerRadius)
            .outerRadius(params.outerRadius)
            .cornerRadius(params.cornerRadius)
            .padAngle(params.padAngle);

        var x = Number(params.x) || 0;
        var y = Number(params.y) || 0;

        var slices = g
            .selectAll("path.value")
            .data(cooked)
            .enter()
            .append("g")
            .attr("class", function(d, i) {
                return "slice slice" + i;
            });

        slices
            .append("path")
            .attr("class", function(d, i) {
                return "value";
            })
            .attr("d", arc)
            .attr("fill", function(d, i) {
                var ret = color(d.value);
                return ret;
            });

        mark("label");
        mark("value");
        mark("percentage");

        if (params.percentageShow || params.labelShow || params.valueShow) {
            slices
                .filter(d => {
                    return (
                        Number(d.percentage.replace("%", "")) <=
                        params.panelPercentage
                    );
                })
                .on("mouseover", function(d, i) {
                    d3.selectAll(".tooltip").remove();
                    var tooltip = d3
                        .select("body")
                        .append("div")
                        .attr("id", "tooltip" + i)
                        .classed("tooltip panel panel-info", true)
                        .style("opacity", 0)
                        .style("left", d3.event.pageX + 10 + "px")
                        .style("top", d3.event.pageY + 50 + "px");

                    if (params.labelShow) {
                        tooltip
                            .append("div")
                            .attr("class", "panel-heading")
                            .append("h3")
                            .attr("class", "panel-title")
                            .text(d.label);
                    }
                    if (params.valueShow || params.percentageShow) {
                        var table = tooltip
                            .append("table")
                            .classed("table table-sm", true);
                        var thead = table.append("thead").append("tr");
                        var line = table.append("tbody").append("tr");
                        if (params.valueShow) {
                            thead.append("th").text("Value");
                            line.append("td").text(d.value);
                        }
                        if (params.percentageShow) {
                            thead.append("th").text("Percentage");
                            line.append("td").text(d.percentage);
                        }
                    }
                    tooltip
                        .transition()
                        .duration(1000)
                        .style("opacity", 0.9)
                        .style("top", d3.event.pageY + 10 + "px");
                })
                .on(
                    "click.tooltip",
                    function(d, i) {
                        d3.selectAll(".tooltip").remove();
                    },
                    true
                )
                .on("mouseout", function(d, i) {
                    d3.selectAll(".tooltip").remove();
                });
        }

        var random = d3.randomUniform(0, data.length);
        var trs = [];
        var trs_onload = [];
        var flag_slow_in = false;
        var flag_on_load = false;
        var flag_hover_load = false;

        for (var i = params.transitions.length - 1; i >= 0; i--) {
            if (params.transitions[i].name == "color shift") {
                var tri = trs.push(preprocess(params.transitions[i])) - 1;
                colorShift(trs[tri]);
            } else if (params.transitions[i].name == "slow in") {
                // slow in can only be excecuted once
                if (!flag_slow_in) {
                    var tri = trs.push(preprocess(params.transitions[i])) - 1;
                    slowIn(trs[tri]);
                    flag_slow_in = true;
                }
            } else if (params.transitions[i].name == "radius shift") {
                var tri = trs.push(preprocess(params.transitions[i])) - 1;
                radiusShift(trs[tri]);
            } else if (params.transitions[i].name == "pizza hover") {
                var tri = trs.push(preprocess(params.transitions[i])) - 1;
                trs_onload.push(trs[tri]);
            }
        }

        function mark(type) {
            if (params[type + "Show"] !== true) return;

            if (params[type + "Radius"] > 0) {
                var arcTemp = arc
                    .innerRadius(params[type + "Radius"])
                    .outerRadius(params[type + "Radius"]);
            } else {
                var arcTemp = arc;
            }
            // console.log("params."+type+"Radius: ", params[type + "Radius"]);
            slices
                .filter(d => {
                    return (
                        Number(d.percentage.replace("%", "")) >
                        params.panelPercentage
                    );
                })
                .append("text")
                .attr("class", "font-weight-normal")
                .attr("transform", function(d) {
                    return "translate(" + arcTemp.centroid(d) + ")";
                })
                .text(function(d) {
                    return d[type];
                });
        }

        // tr for transition
        function preprocess(args) {
            var type =
                args.name == "slow in"
                    ? args.type || "rotate"
                    : args.type || "inner";
            return {
                type: type,
                name: args.name,
                delay: args.delay || 100,
                duration: args.duration || 500,
                ease: args.ease || "Cubic",
                start: args.start != 0 ? args.start : 0,
                end: args.end != 0 ? args.end : 0,
                period: args.period || 1000,
                order: args.order || "desc",
                direction: args.direction || "x",
                gap: args.gap || 0
            };
        }

        function colorShift(tr) {
            // console.log("Var Color Detected", tr);
            var interpolators = [
                // These are from d3-scale.
                "Viridis",
                "Inferno",
                "Magma",
                "Plasma",
                "Warm",
                "Cool",
                "Rainbow",
                // "CubehelixDefault",
                // These are from d3-scale-chromatic
                // "Blues",
                // "Greens",
                // "Greys",
                // "Oranges",
                // "Purples",
                // "Reds",
                "BuGn",
                "BuPu",
                "GnBu",
                "OrRd",
                "PuBuGn",
                "PuBu",
                "PuRd",
                "RdPu",
                "YlGnBu",
                "YlGn",
                "YlOrBr",
                "YlOrRd"
            ];
            var index = 0;
            var count = 0;
            var colorCb = function(index) {
                var curColor = interpolators[index % interpolators.length];
                // console.log("curInterpolator:", curColor);
                var curInterpolator = d3["interpolate" + curColor];
                color.interpolator(curInterpolator);
                g.selectAll("path.value")
                    .transition()
                    .delay((d, i, nodes) => {
                        if (tr.order == "desc") {
                            return d.index * tr.gap + tr.delay;
                        } else if (tr.order == "asc") {
                            return (
                                (nodes.length - d.index - 1) * tr.gap + tr.delay
                            );
                        } else if (tr.order == "random") {
                            return random() * tr.gap + tr.delay;
                        } else {
                            throw new Error("unsupported order");
                        }
                    })
                    .duration(tr.duration)
                    .ease(d3["ease" + tr.ease])
                    .attr("fill", function(d, i) {
                        // d = d. data mark
                        return color(d.value);
                        // return color(colorScale(d.value));
                    });
            };
            var interval = d3.interval(function() {
                index = Math.floor(d3.randomUniform(0, interpolators.length)());
                // index++;
                colorCb(index % interpolators.length);
                count++;
                if (tr.end > 0 && count > tr.end) {
                    interval.stop();
                }
            }, tr.period);
        }

        function slowIn(tr) {
            // console.log("slow in detected:",tr, " with type: ", tr.type);
            var arc2degree = d3
                .scaleLinear()
                .domain([0, 2 * Math.PI])
                .range([0, 360]);
            // invisible in the beginning
            slices.style("opacity", 0);

            if (tr.type == "rotate") {
                slices.attr("transform", function(d) {
                    var ret = "rotate(-" + arc2degree(d.startAngle) + ")";
                    return ret;
                });
                slices
                    .transition()
                    .delay((d, i, nodes) => {
                        if (tr.order == "desc") {
                            return d.index * tr.gap + tr.delay;
                        } else if (tr.order == "asc") {
                            return (
                                (nodes.length - d.index - 1) * tr.gap + tr.delay
                            );
                        } else if (tr.order == "random") {
                            return random() * tr.gap + tr.delay;
                        } else {
                            throw new Error("unsupported order");
                        }
                    })
                    .duration(tr.duration)
                    .ease(d3["ease" + tr.ease])
                    .attrTween("transform", (d, i) => {
                        // d = d. data mark
                        // console.log("attrTween!", d.label, d.startAngle);
                        return d3.interpolate(
                            "rotate(-" + arc2degree(d.startAngle) + ")",
                            "rotate(0)"
                        );
                    })
                    .style("opacity", 1)
                    .on("end", transitions_onload);
            } else if (tr.type == "translate") {
                var tr_f = function(pos) {
                    var ret = "translate(";
                    if (tr.direction == "x") {
                        ret += tr[pos] + ", 0)";
                    } else if (tr.direction == "y") {
                        ret += "0, " + tr[pos] + ")";
                    } else {
                        throw new Error("direction should be x or y");
                    }
                    return ret;
                };
                slices.attr("transform", () => {
                    return tr_f("start");
                });
                slices
                    .transition()
                    .delay((d, i, nodes) => {
                        if (tr.order == "desc") {
                            return d.index * tr.gap + tr.delay;
                        } else if (tr.order == "asc") {
                            return (
                                (nodes.length - d.index - 1) * tr.gap + tr.delay
                            );
                        } else if (tr.order == "random") {
                            return random() * tr.gap + tr.delay;
                        } else {
                            throw new Error("unsupported order");
                        }
                    })
                    .duration(tr.duration)
                    .ease(d3["ease" + tr.ease])
                    .attr("transform", () => {
                        return tr_f("end");
                    })
                    .style("opacity", 1)
                    .on("end", transitions_onload);
            }
        }

        function radiusShift(tr) {
            // console.log("radius shift detected, with type: ", tr.type);
            if (tr.start == "0" || tr.start == 0) {
                tr.start = 0.1;
            }
            if (tr.end == "0" || tr.end == 0) {
                tr.end = 0.1;
            }

            if (tr.type == "inner") {
                var arc0 = arc
                    .innerRadius(tr.start)
                    .outerRadius(params.outerRadius);
            } else if (tr.type == "outer") {
                var arc0 = arc
                    .innerRadius(params.innerRadius)
                    .outerRadius(tr.start);
            }
            arc0.padAngle(params.padAngle);
            slices.select("path").attr("d", arc0);
            slices
                .select("path")
                .transition()
                .delay((d, i, nodes) => {
                    if (tr.order == "desc") {
                        return d.index * tr.gap + tr.delay;
                    } else if (tr.order == "asc") {
                        return (nodes.length - d.index - 1) * tr.gap + tr.delay;
                    } else if (tr.order == "random") {
                        return random() * tr.gap + tr.delay;
                    } else {
                        throw new Error("unsupported order");
                    }
                })
                .duration(tr.duration)
                .ease(d3["ease" + tr.ease])
                .attrTween("d", function(d) {
                    var i = d3.interpolate(tr.start, tr.end);
                    return function(t) {
                        var r = i(t);
                        if (tr.type == "inner") {
                            var arct = arc0.innerRadius(r);
                        } else if (tr.type == "outer") {
                            var arct = arc0.outerRadius(r);
                        }
                        return arct(d);
                    };
                });
        }

        function pizzaHover(tr) {
            // console.log("pizza hover detected:", tr);
            slices
                .on("mouseover.pizza", function(d, i, nodes) {
                    d3.select(this)
                        .filter(d => {
                            return !d.pizzaFlag;
                        })
                        .transition()
                        .delay(tr.delay)
                        .duration(tr.duration)
                        .ease(d3["ease" + tr.ease])
                        .attr("transform", function(d, i, nodes) {
                            d.pizzaFlag = true;
                            return (
                                "translate(" +
                                arc.centroid(d).map(item => {
                                    return item * tr.end;
                                }) +
                                ")"
                            );
                        });
                })
                .on("mouseout.pizza", function(d, i, nodes) {
                    d3.select(this)
                        .filter(d => {
                            return d.pizzaFlag;
                        })
                        .transition()
                        .delay(tr.delay)
                        .duration(tr.duration)
                        .ease(d3["ease" + tr.ease])
                        .attr("transform", d => {
                            d.pizzaFlag = false;
                            return "";
                        });
                });
        }

        function transitions_onload() {
            if (flag_on_load) return;
            for (var i = trs_onload.length - 1; i >= 0; i--) {
                if (trs_onload[i].name == "pizza hover" && !flag_hover_load) {
                    pizzaHover(trs_onload[i]);
                    flag_hover_load = true;
                }
            }
            flag_on_load = true;
        }
    }
}

function getBodyStringOfFunction(func) {
    var funcStr = func.toString();
    const bodyStart = funcStr.indexOf("{") + 1;
    const bodyEnd = funcStr.lastIndexOf("}");
    return "\n" + funcStr.substring(bodyStart, bodyEnd) + "\n";
}

module.exports = {
    Pie
};
