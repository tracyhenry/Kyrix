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
}

Pie.prototype = {
    getPieRenderer
};

module.exports = {
    Pie
};
