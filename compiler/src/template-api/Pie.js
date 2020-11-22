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
    Layer.call(this, transform, true);

    this.innerRadius = args.innerRadius || 0.01;
    this.outerRadius = args.outerRadius || 200;

    this.renderingParams = {
        [pie_name]: {
            innerRadius: this.innerRadius,
            outerRadius: this.outerRadius,
            colorInterpolator: args.colorInterpolator || "Viridis",
            cornerRadius: args.cornerRadius || 0,
            padAngle: args.padAngle || 0,
            transitions: args.transitions || [],
            indices: args.indices || []
        }
    };

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
        cooked.forEach(entry => {
            for (x in entry.data) {
                entry[x] = entry.data[x];
            }
            delete entry.data;
        });

        var g = svg.append("g").attr("class", "gPie");

        var arc = d3
            .arc()
            .innerRadius(params.innerRadius)
            .outerRadius(params.outerRadius)
            .cornerRadius(params.cornerRadius)
            .padAngle(params.padAngle);

        var slices = g
            .selectAll("path.value")
            .data(cooked)
            .enter()
            .append("g");
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

        var random = d3.randomUniform(0, data.length);
        for (var i = params.transitions.length - 1; i >= 0; i--) {
            if (params.transitions[i].name == "slow in")
                slowIn(preProcess(params.transitions[i]));
            else if (params.transitions[i].name == "radius shift")
                radiusShift(preProcess(params.transitions[i]));
        }

        // tr for transition
        function preProcess(args) {
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

        function slowIn(tr) {
            var arc2degree = d3
                .scaleLinear()
                .domain([0, 2 * Math.PI])
                .range([0, 360]);
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
                        }
                    })
                    .duration(tr.duration)
                    .ease(d3["ease" + tr.ease])
                    .attrTween("transform", (d, i) => {
                        return d3.interpolate(
                            "rotate(-" + arc2degree(d.startAngle) + ")",
                            "rotate(0)"
                        );
                    })
                    .style("opacity", 1)
                    .on("end", setPizzaHover);
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
                    .on("end", setPizzaHover);
            }
        }

        function radiusShift(tr) {
            tr.start = 0.1;
            tr.end = 0.1;

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

        function setPizzaHover() {
            slices
                .on("mouseover.pizza", function(d) {
                    d3.select(this)
                        .filter(d => {
                            return !d.pizzaFlag;
                        })
                        .transition()
                        .delay(tr.delay)
                        .duration(tr.duration)
                        .ease(d3["ease" + tr.ease])
                        .attr("transform", function(d) {
                            d.pizzaFlag = true;
                            return (
                                "translate(" +
                                arc.centroid(d).map(item => item * tr.end) +
                                ")"
                            );
                        });
                })
                .on("mouseout.pizza", function(d) {
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
