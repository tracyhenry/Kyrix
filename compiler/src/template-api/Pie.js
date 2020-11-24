const getBodyStringOfFunction = require("./Utilities").getBodyStringOfFunction;
const formatAjvErrorMessage = require("./Utilities").formatAjvErrorMessage;
const fs = require("fs");

/*
 * Constructor of a pie / doughnut
 * @param args
 * @constructor
 * by xinli on 07/22/19
 */
function Pie(args_) {
    // verify against schema
    // defaults are assigned at the same time
    var args = JSON.parse(JSON.stringify(args_));
    var schema = JSON.parse(
        fs.readFileSync("../../src/template-api/json-schema/Pie.json")
    );
    var ajv = new require("ajv")({useDefaults: true});
    var validator = ajv.compile(schema);
    var valid = validator(args);
    if (!valid)
        throw new Error(
            "Constructing Pie: " + formatAjvErrorMessage(validator.errors[0])
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
            "Constructing Pie: query fields " +
                "(query.dimensions, query.measure, query.sampleFields) have duplicates."
        );

    // add default tooltip columns and measures, which is the union of
    // query dimensions and measure
    if (!("tooltip" in args))
        args.tooltip = {
            columns: args.query.dimensions.concat([args.query.measure]),
            aliases: args.query.dimensions.concat([args.query.measure])
        };

    // tooltip column and aliases must have the same length
    if (args.tooltip.columns.length !== args.tooltip.aliases.length)
        throw new Error(
            "Constructing Pie: Tooltip columns and aliases should have the same length."
        );

    // get args into "this"
    var keys = Object.keys(args);
    for (var i = 0; i < keys.length; i++) this[keys[i]] = args[keys[i]];
}

function getPieRenderer() {
    var renderFuncBody = getBodyStringOfFunction(renderer);
    return new Function("svg", "data", "args", renderFuncBody);

    function renderer(svg, data, args) {
        var g = svg.append("g");
        var rpKey = "pie_" + args.pieId.substring(0, args.pieId.indexOf("_"));
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
        var color = d3
            .scaleOrdinal()
            .domain(d3.range(0, data.length))
            .range(d3[params.colorScheme]);

        var cooked = pie(data);
        cooked.forEach(function(d) {
            for (var key in d.data) d[key] = d.data[key];
            delete d.data;
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

        if (!params.transition) return;

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

            if (tr.type === "rotate") {
                slices.attr("transform", function(d) {
                    var ret = "rotate(-" + arc2degree(d.startAngle) + ")";
                    return ret;
                });
                slices
                    .transition()
                    .delay(function(d, i, nodes) {
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
                    .attrTween("transform", function(d, i) {
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
                slices.attr("transform", function() {
                    return tr_f("start");
                });
                slices
                    .transition()
                    .delay(function(d, i, nodes) {
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
                    .attr("transform", function() {
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
                .delay(function(d, i, nodes) {
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
                        .filter(function(d) {
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
                        .filter(function(d) {
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

Pie.prototype = {
    getPieRenderer
};

module.exports = {
    Pie
};
