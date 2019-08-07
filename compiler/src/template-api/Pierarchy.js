const Pie = require("../../src/template-api/Pie").Pie;
const Layer = require("../../src/Layer").Layer;
const Transform = require("../../src/Transform").Transform;
const fs = require("fs");
/*
 * Constructor of a pierarchy
 * @param args
 * @constructor
 * by xinli on 07/26/19
 */
function Pierarchy(args) {
    args = args || {};

    // check required args
    var requiredArgs = ["name", "data", "value", "children", "label"];
    var requiredArgsTypes = ["string", "string", "string", "string", "string"];
    for (var i = 0; i < requiredArgs.length; i++) {
        if (!(requiredArgs[i] in args))
            throw new Error(
                "Constructing Pierarchy: " + requiredArgs[i] + " missing."
            );
        if (typeof args[requiredArgs[i]] !== requiredArgsTypes[i])
            throw new Error(
                "Constructing Pierarchy: " +
                    requiredArgs[i] +
                    " must be " +
                    requiredArgsTypes[i] +
                    "."
            );
        if (requiredArgsTypes[i] == "string")
            if (args[requiredArgs[i]].length == 0)
                throw new Error(
                    "Constructing Pierarchy: " +
                        requiredArgs[i] +
                        " cannot be an empty string."
                );
    }

    if (args.data.search(/(\.json)\s*$/) < 0)
        throw new Error("unsupported data file type");

    var data = JSON.parse(fs.readFileSync(args.data));
    var name = args.name;
    var children = args.children;
    var label = args.label;
    var value = args.value;

    function deepTraversal(node, depth, parent_id) {
        node.id = id++;
        if (!node["children"]) {
            index =
                set.push([
                    node.id,
                    node[label],
                    parent_id,
                    node[value],
                    depth,
                    0
                ]) - 1;
            // set[index].height = 0;
            return index;
        } else {
            var indices = [];
            // for (var i = node[children].length - 1; i >= 0; i--) {
            //  indices.push(deepTraversal(node[children][i], depth+1, node.id))
            // }
            node[children].forEach(item => {
                indices.push(deepTraversal(item, depth + 1, node.id));
            });
            var sum = 0;
            var maxH = 0;
            indices.forEach(i => {
                sum += set[i][3];
                if (maxH < set[i][5]) maxH = set[i][5];
            });
            index =
                set.push([
                    node.id,
                    node[label],
                    parent_id,
                    sum,
                    depth,
                    maxH + 1
                ]) - 1;
            return index;
        }
    }
    var id = 0;
    var set = [];
    deepTraversal(data, 0, -1);

    this.data = set;
    var db = args.db || "kyrix";

    // var query = genQuery();
    var query = "select * from pierarchy";

    // var transform_func = function(row, w_canvas, h_canvas, renderParams) {
    //     var ret = [];
    //     // row: value, (label),  rn_kyrix
    //     var args = renderParams.pie;
    //     for (var i = 0; i < row.length; i++) {
    //         ret.push(row[i]);
    //     }
    //     return Java.to(ret, "java.lang.String[]");
    // };
    var transform_func = "";

    args.indices = args.indices || [];
    // var schema = args.indices.concat(["value", "label"]);
    var schema = ["id", "label", "parent_id", "value", "depth", "height"];

    console.log("schema:", schema);

    var transform = new Transform(query, db, transform_func, schema, true);

    // Pierarchy is a static layer
    Layer.call(this, transform, true);
    // Pierarchy is a dynamic layer
    // Layer.call(this, transform, false);

    this.cx = args.cx || 300;
    this.cy = args.cy || 300;
    this.innerRadius = args.innerRadius || 0.01;
    this.outerRadius = args.outerRadius || 200;
    this.colorInterpolator = args.colorInterpolator || "Viridis";
    this.labelShow = args.labelShow || false;
    this.labelRadius = args.labelRadius || -1;
    this.valueShow = args.valueShow || false;
    this.valueRadius = args.valueRadius || -1;
    this.percentageShow = args.percentageShow || false;
    this.percentageRadius = args.percentageRadius || -1;
    this.panelPercentage = args.panelPercentage || -1;
    this.cornerRadius = args.cornerRadius || 0;
    this.padRadius = args.padRadius || 0;
    this.padAngle = args.padAngle || 0;
    this.transitions = args.transitions || [];
    this.indices = args.indices || [];

    this.renderingParams = {
        pie: {
            cx: this.cx,
            cy: this.cy,
            innerRadius: this.innerRadius,
            outerRadius: this.outerRadius,
            colorInterpolator: this.colorInterpolator,
            labelShow: this.labelShow,
            labelRadius: this.labelRadius,
            valueShow: this.valueShow,
            valueRadius: this.valueRadius,
            percentageShow: this.percentageShow,
            percentageRadius: this.percentageRadius,
            panelPercentage: this.panelPercentage,
            padRadius: this.padRadius,
            cornerRadius: this.cornerRadius,
            padAngle: this.padAngle,
            transitions: this.transitions,
            indices: this.indices
        }
    };

    // var pierarchyPlacement = {
    //     centroid_x: "con:" + this.cx,
    //     centroid_y: "con:" + this.cy,
    //     width: "con:" + this.outerRadius,
    //     height: "con:" + this.outerRadius
    //     // centroid_x: "full",
    //     // centroid_y: "full",
    //     // width: "full",
    //     // height: "full"
    // };

    // this.addPlacement(pierarchyPlacement);

    var rendering_func = function(svg, data, rend_args) {
        // console.log("raw: ", data);

        var params = rend_args.renderingParams.pie;
        var extent = d3.extent(
            d3.values(
                data.map(function(d) {
                    return +d.value;
                })
            )
        );
        console.log("extent:", extent);
        var color = d3
            .scaleSequential(d3["interpolate" + params.colorInterpolator])
            .domain(extent);
        var pie = d3.pie().value(function(d) {
            return d.value;
        });
        // .padAngle(params.padAngle);
        var cooked = pie(data);
        console.log("cooked: ", cooked);

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
        // .cornerRadius(15)

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

        if (params.labelShow == true) {
            if (params.labelRadius > 0) {
                console.log("params.labelRadius: ", params.labelRadius);
                var arcLabel = arc
                    .innerRadius(params.labelRadius)
                    .outerRadius(params.labelRadius);
            } else {
                console.log("params.labelRadius: ", params.labelRadius);
                var arcLabel = arc;
            }
            slices
                .filter(d => {
                    return (
                        Number(d.percentage.replace("%", "")) >
                        params.panelPercentage
                    );
                })
                .append("text")
                .attr("class", "label")
                .attr("transform", function(d) {
                    return "translate(" + arcLabel.centroid(d) + ")";
                })
                .text(function(d) {
                    return d.label;
                });
        }

        if (params.valueShow == true) {
            if (params.valueRadius > 0) {
                console.log("params.valueRadius: ", params.valueRadius);
                var arcValue = arc
                    .innerRadius(params.valueRadius)
                    .outerRadius(params.valueRadius);
            } else {
                console.log("params.valueRadius: ", params.valueRadius);
                var arcValue = arc;
            }
            slices
                .filter(d => {
                    return (
                        Number(d.percentage.replace("%", "")) >
                        params.panelPercentage
                    );
                })
                .append("text")
                .attr("class", "value label")
                .attr("transform", function(d) {
                    return "translate(" + arcValue.centroid(d) + ")";
                })
                .text(function(d) {
                    return d.value;
                });
        }

        if (params.percentageShow == true) {
            if (params.percentageRadius > 0) {
                console.log(
                    "params.percentageRadius: ",
                    params.percentageRadius
                );
                var arcPercentage = arc
                    .innerRadius(params.percentageRadius)
                    .outerRadius(params.percentageRadius);
            } else {
                console.log(
                    "params.percentageRadius: ",
                    params.percentageRadius
                );
                var arcPercentage = arc;
            }
            slices
                .filter(d => {
                    return (
                        Number(d.percentage.replace("%", "")) >
                        params.panelPercentage
                    );
                })
                .append("text")
                .attr("class", "percentage label")
                .attr("transform", function(d) {
                    return "translate(" + arcPercentage.centroid(d) + ")";
                })
                .text(function(d) {
                    return d.percentage;
                });
        }

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
                        // .style("width", 300)
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
                            // .append("div")
                            // .attr("class", "panel-body")
                            .append("table")
                            .classed("table table-sm", true);
                        var thead = table
                            .append("thead")
                            // .attr("class", "thead-light")
                            .append("tr");
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

        // tr for transition
        var preprocess = function(args) {
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
        };

        var random = d3.randomUniform(0, data.length);

        var tr0 = params.transitions.find(ele => {
            return ele.name == "color shift";
        });
        if (tr0) {
            tr0 = preprocess(tr0);
            console.log("tr0:", tr0);
            console.log("Var Color Detected");
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
                console.log("curInterpolator:", curColor);
                var curInterpolator = d3["interpolate" + curColor];
                color.interpolator(curInterpolator);
                g.selectAll("path.value")
                    .transition()
                    .delay((d, i, nodes) => {
                        if (tr0.order == "desc") {
                            return d.index * tr0.gap + tr0.delay;
                        } else if (tr0.order == "asc") {
                            return (
                                (nodes.length - d.index - 1) * tr0.gap +
                                tr0.delay
                            );
                        } else if (tr0.order == "random") {
                            return random() * tr0.gap + tr0.delay;
                        } else {
                            throw new Error("unsupported order");
                        }
                    })
                    .duration(tr0.duration)
                    .ease(d3["ease" + tr0.ease])
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
                if (tr0.end > 0 && count > tr0.end) {
                    interval.stop();
                    console.log(
                        "SHOULD END BY NOW, index",
                        index,
                        " end:",
                        tr0.end
                    );
                }
            }, tr0.period);
        }

        var tr1 = params.transitions.find(ele => {
            return ele.name == "slow in";
        });
        if (tr1) {
            tr1 = preprocess(tr1);
            console.log("slow in tr1:", tr1);
            console.log("slow in detected, with type: ", tr1.type);
            var arc2degree = d3
                .scaleLinear()
                .domain([0, 2 * Math.PI])
                .range([0, 360]);
            // invisible in the beginning
            slices.style("opacity", 0);

            if (tr1.type == "rotate") {
                slices.attr("transform", function(d) {
                    var ret = "rotate(-" + arc2degree(d.startAngle) + ")";
                    return ret;
                });
                slices
                    .transition()
                    .delay((d, i, nodes) => {
                        if (tr1.order == "desc") {
                            return d.index * tr1.gap + tr1.delay;
                        } else if (tr1.order == "asc") {
                            return (
                                (nodes.length - d.index - 1) * tr1.gap +
                                tr1.delay
                            );
                        } else if (tr1.order == "random") {
                            return random() * tr1.gap + tr1.delay;
                        } else {
                            throw new Error("unsupported order");
                        }
                    })
                    .duration(tr1.duration)
                    .ease(d3["ease" + tr1.ease])
                    .attrTween("transform", (d, i) => {
                        // d = d. data mark
                        console.log("attrTween!", d.label, d.startAngle);
                        return d3.interpolate(
                            "rotate(-" + arc2degree(d.startAngle) + ")",
                            "rotate(0)"
                        );
                    })
                    .style("opacity", 1)
                    .on("end", afterSlowin);
            } else if (tr1.type == "translate") {
                var tr_f = function(pos) {
                    var ret = "translate(";
                    if (tr1.direction == "x") {
                        ret += tr1[pos] + ", 0)";
                    } else if (tr1.direction == "y") {
                        ret += "0, " + tr1[pos] + ")";
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
                        if (tr1.order == "desc") {
                            return d.index * tr1.gap + tr1.delay;
                        } else if (tr1.order == "asc") {
                            return (
                                (nodes.length - d.index - 1) * tr1.gap +
                                tr1.delay
                            );
                        } else if (tr1.order == "random") {
                            return random() * tr1.gap + tr1.delay;
                        } else {
                            throw new Error("unsupported order");
                        }
                    })
                    .duration(tr1.duration)
                    .ease(d3["ease" + tr1.ease])
                    .attr("transform", () => {
                        return tr_f("end");
                    })
                    .style("opacity", 1)
                    .on("end", afterSlowin);
            }
        }

        var tr2 = params.transitions.find(ele => {
            return ele.name == "varying radius";
        });
        if (tr2) {
            tr2 = preprocess(tr2);
            console.log("varying radius tr2:", tr2);
            console.log("varying radius detected, with type: ", tr2.type);
            console.log("start:", typeof tr2.start, tr2.start);
            console.log("end:", typeof tr2.end, tr2.end);
            if (tr2.start == "0" || tr2.start == 0) {
                tr2.start = 0.1;
            }
            if (tr2.end == "0" || tr2.end == 0) {
                tr2.end = 0.1;
            }

            // if (tr2.type == "inner") {
            //     // console.log("arc code", JSON.stringify(arc))
            //     // var arc0 = JSON.parse(JSON.stringify((arc)))
            //     var arc0 = d3.arc()
            //         .innerRadius(tr2.start)
            //         .outerRadius(params.outerRadius)
            //         .cornerRadius(params.cornerRadius)
            //         // .padRadius(params.padRadius)
            //         .padAngle(params.padAngle)
            //     // var arc1 = JSON.parse(JSON.stringify((arc)))
            //     var arc1 = d3.arc()
            //         .innerRadius(tr2.end)
            //         .outerRadius(params.outerRadius)
            //         .cornerRadius(params.cornerRadius)
            //         // .padRadius(params.padRadius)
            //         .padAngle(params.padAngle)
            //     // arc1 = Object.assign(arc1, arc)
            //     //     .innerRadius(tr2.end)
            //     //     .outerRadius(params.outerRadius);
            // } else if (tr2.type == "outer") {
            //     var arc0 = d3.arc()
            //         .innerRadius(params.innerRadius)
            //         .outerRadius(tr2.start);
            //     var arc1 = d3.arc()
            //         .innerRadius(params.innerRadius)
            //         .outerRadius(tr2.end);
            // }
            // console.log("arc==arc0", arc==arc0 )
            // console.log("arc==arc1", arc==arc1 )
            // console.log("arc0==arc1", arc0==arc1 )

            if (tr2.type == "inner") {
                var arc0 = arc
                    .innerRadius(tr2.start)
                    .outerRadius(params.outerRadius);
            } else if (tr2.type == "outer") {
                var arc0 = arc
                    .innerRadius(params.innerRadius)
                    .outerRadius(tr2.start);
            }
            arc0.padAngle(params.padAngle);
            slices.select("path").attr("d", arc0);
            slices
                .select("path")
                .transition()
                .delay((d, i, nodes) => {
                    if (tr2.order == "desc") {
                        return d.index * tr2.gap + tr2.delay;
                    } else if (tr2.order == "asc") {
                        return (
                            (nodes.length - d.index - 1) * tr2.gap + tr2.delay
                        );
                    } else if (tr2.order == "random") {
                        return random() * tr2.gap + tr2.delay;
                    } else {
                        throw new Error("unsupported order");
                    }
                })
                .duration(tr2.duration)
                .ease(d3["ease" + tr2.ease])
                .attrTween("d", function(d) {
                    var i = d3.interpolate(tr2.start, tr2.end);
                    return function(t) {
                        var r = i(t);
                        if (tr2.type == "inner") {
                            var arct = arc0.innerRadius(r);
                        } else if (tr2.type == "outer") {
                            var arct = arc0.outerRadius(r);
                        }
                        return arct(d);
                    };
                });
        }

        function afterSlowin() {
            var tr3 = params.transitions.find(ele => {
                return ele.name == "pizza hover";
            });
            if (tr3) {
                console.log("pizza hover detected:", tr3);
                tr3 = preprocess(tr3);
                slices
                    .on("mouseover.pizza", function(d, i, nodes) {
                        d3.select(this)
                            .filter(d => {
                                return !d.pizzaFlag;
                            })
                            .transition()
                            .delay(tr3.delay)
                            .duration(tr3.duration)
                            .ease(d3["ease" + tr3.ease])
                            .attr("transform", function(d, i, nodes) {
                                d.pizzaFlag = true;
                                return (
                                    "translate(" +
                                    arc.centroid(d).map(item => {
                                        return item * tr3.end;
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
                            .delay(tr3.delay)
                            .duration(tr3.duration)
                            .ease(d3["ease" + tr3.ease])
                            .attr("transform", d => {
                                d.pizzaFlag = false;
                                return "";
                            });
                    });
            }
        }
    };

    this.addRenderingFunc(rendering_func);

    this.setIsHierarchical(true);

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
        console.log("Pierarchy query !!!:", ret);
        return ret;
    }
}
(function() {
    // create a class with no instance method
    var Super = function() {};
    Super.prototype = Layer.prototype;
    // use its instance as the prototype of Pierarchy
    Pierarchy.prototype = new Super();
})();

function getBodyStringOfFunction(func) {
    var funcStr = func.toString();
    const bodyStart = funcStr.indexOf("{") + 1;
    const bodyEnd = funcStr.lastIndexOf("}");
    return "\n" + funcStr.substring(bodyStart, bodyEnd) + "\n";
}

module.exports = {
    Pierarchy: Pierarchy
};
