const Transform = require("../Transform").Transform;
const Layer = require("../Layer").Layer;
const fs = require("fs");
const d3 = require("d3");
/*
 * Constructor of a zoomable treemap
 * @param args
 * @constructor
 * by xinli on 08/05/19
 */
function Treemap(args) {
    args = args || {};

    // check required args
    var requiredArgs = ["data", "value", "children", "label"];
    var requiredArgsTypes = ["string", "string", "string", "string"];
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
    var id = 0;
    var set = [];

    // deepTraversal(data, 0, -1);

    // console.log(d3.hierarchy(data))

    var rand = Math.random()
        .toString(36)
        .substr(2)
        .slice(0, 5);
    this.name = "kyrix_treemap_" + rand;
    this.data = data;
    // this.data = set;

    this.x = args.x || 0;
    this.y = args.y || 0;
    this.width = args.width || 1200;
    this.height = args.height || 800;
    this.padding = args.padding || 5;
    this.children = children;
    this.label = label;
    this.value = value;

    this.zoomFactor = args.zoomFactor || 1.5;

    // padding
    this.paddingOuter = args.paddingOuter || 1;
    this.paddingTop = args.paddingTop || 30;
    this.paddingInner = args.paddingInner || 1;

    this.viewW = args.viewW || 1200;
    this.viewH = args.viewH || 800;

    // this.placement = {
    //     centroid_x: "con:" + (+this.x + +this.width * 0.5),
    //     centroid_y: "con:" + (+this.y + +this.height * 0.5),
    //     width: "con:" + this.width,
    //     height: "con:" + this.height
    // };

    this.placement = {
        centroid_x: "col:x",
        centroid_y: "col:y",
        width: "col:w",
        height: "col:h"
    };

    this.renderingParams = {
        [this.name]: {
            colorInterpolator: args.colorInterpolator || "Rainbow",
            // colorInterpolator: args.colorInterpolator || "Viridis"
            transitions: args.transitions || []
        }
    };
}

function getTransformFunc(pie_name) {
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

function getOverviewScale(zoomFactor) {
    var scaleBody = getBodyStringOfFunction(scaleFunc);
    scaleBody = scaleBody.replace(/REPLACE_ME_zoomFactor/g, zoomFactor);

    return new Function("x0, y0", scaleBody);

    function scaleFunc(x0, y0) {
        var k = REPLACE_ME_zoomFactor;
        return {x: x0 / k, y: y0 / k};
    }
}

function getRenderer(level) {
    var rendererBody = getBodyStringOfFunction(renderer);
    rendererBody = rendererBody
        .replace(/REPLACE_ME_name/g, this.name)
        .replace(/REPLACE_ME_w/g, this.width)
        .replace(/REPLACE_ME_h/g, this.height)
        .replace(/REPLACE_ME_padding/g, this.padding)
        .replace(/REPLACE_ME_level/g, level)
        .replace(/REPLACE_ME_zoomFactor/g, this.zoomFactor);

    return new Function("svg, data, rend_args", rendererBody);

    function renderer(svg, data, rend_args) {
        // console.log("rend_args:", rend_args);
        console.log("raw:", data);
        var params = rend_args.renderingParams["REPLACE_ME_name"];
        var g = svg.append("g").attr("id", "REPLACE_ME_name");

        var root = d3
            .stratify()
            .id(function(d) {
                return d.label;
            }) // Name of the entity (column name is name in csv)
            .parentId(function(d) {
                if (d.parent == "none") return undefined;
                return d.parent;
            })(
            // Name of the parent (column name is parent in csv)
            data
        );

        // data.forEach((d,i,nodes)=>{
        //     d.node = findNode(root, d.label)
        //     d.rex = +d.minx + +d.depth * 5
        //     d.rey = +d.miny + +d.depth * 5
        //     d.rew = d3.max([0, +d.w - 10 * +d.depth])
        //     d.reh = d3.max([0, +d.h - 10 * +d.depth])
        // })

        var extentValue = d3.extent(d3.values(data.map(d => +d.value)));
        // console.log("params:", params)
        // var color = d3
        //     .scaleSequential(d3["interpolate" + params.colorInterpolator])
        //     .domain([0, 1]);
        var color = d3.scaleOrdinal(d3.schemeAccent);
        // var log = d3.scaleLog()
        //     .range([1e-6, 1])
        //     .domain(extentValue)

        // .domain(['a'.charCodeAt(0) , 'z'.charCodeAt(0)]);
        // var color = d3.scaleOrdinal(d3.schemeCategory20)
        // var color = d3
        //     .schemeTableau10()

        var opacity = d3
            .scaleLinear()
            .domain(0, extentValue[1])
            .range([0.5, 1]);
        // console.log(color('a'))
        // console.log(color('abc'[1]))

        // var color =

        data.sort((a, b) => {
            return b.height - a.height || b.value - a.value;
        });
        // console.log("raw", data);
        // var nodes = g
        //     .selectAll("g")
        //     .data(data)
        //     .join("g")
        //     .classed("treemap node", true)
        //     .attr("transform", d => `translate(${d.minx},${d.miny})`);

        var zoomFactor = Math.pow(REPLACE_ME_zoomFactor, REPLACE_ME_level);

        console.log("zoomFactor:", zoomFactor);
        var rects = g
            .selectAll("rect")
            .data(data)
            .join("rect")
            .attr("x", d => +d.minx - 0.3 * (+zoomFactor - 1))
            .attr("y", d => +d.miny - 0.3 * (+zoomFactor - 1))
            .attr("width", d => +d.w + 0.3 * (+zoomFactor * 2 - 2))
            .attr("height", d => +d.h + 0.3 * (+zoomFactor * 2 - 2))
            // .attr("x", d=>d.minx + (1 * +d.depth) * zoomFactor )
            // .attr("y", d=>d.miny + (30 * +d.depth) * zoomFactor )
            // .attr("width", d => d.w - (2 * +d.depth) * zoomFactor )
            // .attr("height", d => d.h - (31 * +d.depth) * zoomFactor )
            .classed("treemap node", true)
            // .attr("x", d=>d.rex )
            // .attr("y", d=>d.rey )
            // .attr("width", d => d.rew )
            // .attr("height", d => d.reh )
            // .style("stroke", "black")
            .style("fill", d => color(d.depth));
        // .style("fill", d => color( log(+d.value) ))
        // .style("fill", (d)=> color(d.parent.toLowerCase().charCodeAt(0)))
        // .style("opacity", 0.7);

        var clipPaths = g
            .selectAll("clipPath")
            .data(data)
            .join("clipPath")
            .attr("id", d => d.label + "_clip_" + REPLACE_ME_level)
            .append("rect")
            // .attr("x", d=>d.rex )
            // .attr("y", d=>d.rey )
            // .attr("width", d => d.rew )
            // .attr("height", d => d.reh )
            .attr("x", d => d.minx)
            .attr("y", d => d.miny)
            .attr("width", d => d.w)
            .attr("height", d => d.h);

        rects
            .on("mouseover.tooltip", function(d, i) {
                // highlight
                // d3.select(this).style("opacity", 1);
                // remove all tool tips first
                d3.select("body")
                    .selectAll(".maptooltip")
                    .remove();

                d3.select(this).attr("transform", (d, i) => {
                    `translate(0,15)`;
                });

                // create a new tooltip
                addTooltip(d, i);
            })
            .on("mouseout.tooltip", function(d, i) {
                // d3.select(this).style("opacity", 0.7);
                d3.select(this).attr("transform", (d, i) => {
                    `translate(0,0)`;
                });
                d3.selectAll(".mapTooltip").remove();
            });

        // for (var i = params.transitions.length - 1; i >= 0; i--) {
        //     if (params.transitions[i].name == "color shift") {
        //         var tri = trs.push(preprocess(params.transitions[i])) - 1;
        //         colorShift(trs[tri]);
        //     } else if (params.transitions[i].name == "slow in") {
        //         // slow in can only be excecuted once
        //         if (!flag_slow_in) {
        //             var tri = trs.push(preprocess(params.transitions[i])) - 1;
        //             slowIn(trs[tri]);
        //             flag_slow_in = true;
        //         }
        //     } else if (params.transitions[i].name == "radius shift") {
        //         var tri = trs.push(preprocess(params.transitions[i])) - 1;
        //         radiusShift(trs[tri]);
        //     } else if (params.transitions[i].name == "pizza hover") {
        //         var tri = trs.push(preprocess(params.transitions[i])) - 1;
        //         trs_onload.push(trs[tri]);
        //     }
        // }

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

        var transitions = params.transitions;
        console.log("transitions:", transitions);
        var si = preprocess(transitions[0]);
        slowIn(si);

        var random = d3.randomUniform(0, data.length);
        function slowIn(tr) {
            // console.log("slow in detected:",tr, " with type: ", tr.type);
            var arc2degree = d3
                .scaleLinear()
                .domain([0, 2 * Math.PI])
                .range([0, 360]);
            // invisible in the beginning
            var news = rects
                .sort((a, b) => {
                    return a.depth - b.depth || b.value - a.value;
                })
                .filter(
                    d =>
                        Math.log(d.w) + Math.log(d.h) - Math.log(4) <
                        Math.log(800)
                );

            news.style("opacity", 0);

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
            news.attr("transform", () => {
                return tr_f("start");
            });
            news.transition()
                .delay((d, i, nodes) => {
                    if (tr.order == "desc") {
                        var de = i * tr.gap + +tr.delay;
                        // console.log("de:", de)
                        return de;
                    } else if (tr.order == "asc") {
                        return (nodes.length - d.i - 1) * tr.gap + tr.delay;
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
                .style("opacity", 1);
            // .on("end", transitions_onload);
        }

        function addTooltip(d, i) {
            var node = findNode(root, d.label);
            var ancestors = node.ancestors().reverse();
            // console.log("ancestors:", ancestors)
            var breadcrumb = ancestors
                .map(item => item.id)
                .join("/")
                .replace(/-\//g, "/");
            // console.log("breadcrumb:", breadcrumb)
            var tooltip = d3
                .select("body")
                .append("div")
                .attr("id", "mapTooltip" + i)
                .classed("tooltip card bg-lite mapTooltip", true)
                .style("pointer-events", "none")
                .style("opacity", 0)
                .style("max-width", "180px")
                .style("left", d3.event.pageX + "px")
                .style("top", d3.event.pageY + 50 + "px");
            tooltip
                .transition()
                .duration(500)
                .style("opacity", 0.9)
                .style("top", d3.event.pageY + "px");
            tooltip
                .append("div")
                .classed("card-header", true)
                .append("h6")
                .classed("card-title", true)
                .text(breadcrumb)
                .style("margin", "0px");
            tooltip
                .append("div")
                .classed("card-body", true)
                .style("padding", "5px")
                .append("p")
                .classed("text-center text-primary", true)
                .style("font-size", "18px")
                .style("margin", "0px")
                .text(+d.value);
        }

        function findNode(node, label) {
            if (node.id == label) return node;
            if (!node.children) return undefined;
            var ret;
            for (var child of node.children) {
                ret = findNode(child, label);
                if (ret) return ret;
            }
            return undefined;
        }
    }
}
function getRetainRenderer(zoomFactor, level) {
    var rendererBody = getBodyStringOfFunction(retainRenderer);
    rendererBody = rendererBody
        .replace(/REPLACE_ME_name/g, this.name)
        .replace(/REPLACE_ME_w/g, this.width)
        .replace(/REPLACE_ME_h/g, this.height)
        .replace(/REPLACE_ME_padding/g, this.padding)
        .replace(/REPLACE_ME_zoomFactor/g, zoomFactor)
        .replace(/REPLACE_ME_level/g, level);

    return new Function("svg, data, rend_args", rendererBody);

    function retainRenderer(svg, data, rend_args) {
        // console.log("rend_args:", rend_args);
        var params = rend_args.renderingParams["REPLACE_ME_name"];
        var g = svg.append("g").attr("id", "REPLACE_ME_name" + "_retain");

        // console.log("params:", params)
        data.forEach(d => {
            d.cx = +d.minx;
            d.cy = +d.miny;
        });
        data.sort((a, b) => {
            return a.depth - b.depth || b.value - a.value;
        });
        // console.log("retain!!!:", data);

        var heading = g
            .selectAll("g.node")
            .data(data)
            .join("g")
            .classed("node", true)
            .attr("clip-path", d => `url(#${d.label}_clip_REPLACE_ME_level)`);

        // g.selectAll("text.name")
        //     .data(data)
        //     .join("text")
        heading
            .append("text")
            .classed("node name", true)
            // .attr("clip-path", d => `url(#${d.label}_clip_REPLACE_ME_level)`)
            .attr("x", d => d.rex)
            .attr("y", d => d.rey)
            .attr("width", d => d.rew)
            .attr("height", d => d.reh)
            .attr("x", d => +d.minx)
            .attr("y", d => +d.miny)
            .attr("dy", 13)
            .attr("dx", 3)
            .text(d => d.label);
        // heading
        //     .append("tspan")
        // g.selectAll("text.value")
        // .data(data)
        // .join("text")

        heading
            .append("text")
            .classed("node value", true)
            // .attr("clip-path", d => `url(#${d.label}_clip)`)
            .attr("x", d => +d.minx)
            .attr("y", d => +d.miny)
            .attr("dy", 28)
            .attr("dx", 3)
            .text(d => d.value);

        var root = d3
            .stratify()
            .id(function(d) {
                return d.label;
            }) // Name of the entity (column name is name in csv)
            .parentId(function(d) {
                if (d.parent == "none") return undefined;
                return d.parent;
            })(
            // Name of the parent (column name is parent in csv)
            data
        );
        // console.log("root:", root)

        heading
            .on("mouseover.tooltip", function(d, i) {
                // highlight
                // d3.select(this).style("opacity", 1);
                // remove all tool tips first
                d3.select("body")
                    .selectAll(".maptooltip")
                    .remove();
                // create a new tooltip
                addTooltip(d, i);
            })
            .on("mouseout.tooltip", function(d, i) {
                // d3.select(this).style("opacity", 0.75);
                d3.selectAll(".mapTooltip").remove();
            });

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

        var transitions = params.transitions;
        console.log("transitions:", transitions);
        var si = preprocess(transitions[0]);
        slowIn(si);

        var random = d3.randomUniform(0, data.length);
        function slowIn(tr) {
            // console.log("slow in detected:",tr, " with type: ", tr.type);
            var arc2degree = d3
                .scaleLinear()
                .domain([0, 2 * Math.PI])
                .range([0, 360]);
            // invisible in the beginning
            var news = heading
                .sort((a, b) => {
                    return a.depth - b.depth || b.value - a.value;
                })
                .filter(
                    d =>
                        Math.log(d.w) + Math.log(d.h) - Math.log(4) <
                        Math.log(800)
                );

            news.style("opacity", 0);

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
            news.attr("transform", () => {
                return tr_f("start");
            });
            news.transition()
                .delay((d, i, nodes) => {
                    if (tr.order == "desc") {
                        var de = i * tr.gap + +tr.delay;
                        // console.log("de:", de)
                        return de;
                    } else if (tr.order == "asc") {
                        return (nodes.length - d.i - 1) * tr.gap + tr.delay;
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
                .style("opacity", 1);
            // .on("end", transitions_onload);
        }

        function addTooltip(d, i) {
            var node = findNode(root, d.label);
            var ancestors = node.ancestors().reverse();
            // console.log("ancestors:", ancestors)
            var breadcrumb = ancestors
                .map(item => item.id)
                .join("/")
                .replace(/-\//g, "/");
            // console.log("breadcrumb:", breadcrumb)
            var tooltip = d3
                .select("body")
                .append("div")
                .attr("id", "mapTooltip" + i)
                .classed("tooltip card bg-lite mapTooltip", true)
                .style("pointer-events", "none")
                .style("opacity", 0)
                .style("max-width", "180px")
                .style("left", d3.event.pageX + "px")
                .style("top", d3.event.pageY + 50 + "px");
            tooltip
                .transition()
                .duration(500)
                .style("opacity", 0.9)
                .style("top", d3.event.pageY + "px");
            tooltip
                .append("div")
                .classed("card-header", true)
                .append("h6")
                .classed("card-title", true)
                .text(breadcrumb)
                .style("margin", "0px");
            tooltip
                .append("div")
                .classed("card-body", true)
                .style("padding", "5px")
                .append("p")
                .classed("text-center text-primary", true)
                .style("font-size", "18px")
                .style("margin", "0px")
                .text(+d.value);
        }

        function findNode(node, label) {
            if (node.id == label) return node;
            if (!node.children) return undefined;
            var ret;
            for (var child of node.children) {
                ret = findNode(child, label);
                if (ret) return ret;
            }
            return undefined;
        }
    }
}
function getBodyStringOfFunction(func) {
    var funcStr = func.toString();
    const bodyStart = funcStr.indexOf("{") + 1;
    const bodyEnd = funcStr.lastIndexOf("}");
    return "\n" + funcStr.substring(bodyStart, bodyEnd) + "\n";
}

// define prototype
Treemap.prototype = {
    getRenderer,
    getRetainRenderer,
    getOverviewScale,
    getTransformFunc
};

module.exports = {
    Treemap,
    getTransformFunc,
    getRetainRenderer,
    getOverviewScale,
    getRenderer
};
