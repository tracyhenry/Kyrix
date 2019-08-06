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

    function deepTraversal(node, depth, parent_id) {
        node.id = id++;
        if (!node[children]) {
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
    // deepTraversal(data, 0, -1);

    // console.log(d3.hierarchy(data))

    var rand = Math.random()
        .toString(36)
        .substr(2)
        .slice(0, 5);
    this.name = "kyrix_treemap_" + rand;
    this.data = data;
    // this.data = set;

    this.x = args.x || 5;
    this.y = args.y || 5;
    this.width = args.width || 500;
    this.height = args.height || 500;
    this.padding = args.padding || 5;
    this.children = children;
    this.label = label;
    this.value = value;
    this.zoomFactor = 2;

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
            colorInterpolator: args.colorInterpolator || "Viridis"
        }
    };

    this.viewX = args.viewX || 1000;
    this.viewY = args.viewY || 1000;
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

function getRenderer() {
    var rendererBody = getBodyStringOfFunction(renderer);
    rendererBody = rendererBody
        .replace(/REPLACE_ME_name/g, this.name)
        .replace(/REPLACE_ME_w/g, this.width)
        .replace(/REPLACE_ME_h/g, this.height)
        .replace(/REPLACE_ME_padding/g, this.padding);

    return new Function("svg, data, rend_args", rendererBody);

    function renderer(svg, data, rend_args) {
        // console.log("rend_args:", rend_args);
        var params = rend_args.renderingParams["REPLACE_ME_name"];
        var g = svg.append("g").attr("id", "REPLACE_ME_name");

        // console.log("params:", params)
        var color = d3
            .scaleSequential(d3["interpolate" + params.colorInterpolator])
            .domain([0, params.tree_height]);

        data.sort((a, b) => {
            return b.height - a.height || b.value - a.value;
        });
        console.log("raw", data);
        var nodes = g
            .selectAll("g")
            .data(data)
            .join("g")
            .classed("treemap node", true)
            .attr("transform", d => `translate(${d.minx},${d.miny})`);

        var rects = nodes
            .append("rect")
            .attr("width", d => d.w)
            .attr("height", d => d.h)
            // .style("stroke", "black")
            .style("fill", d => color(d.depth));
        // .style("fill", "#69b3a2");

        // var labels = nodes.append("text")
        //     .attr("x", 3)
        //     .attr("y", 13)
        //     .text((d)=>d.label+" "+d.value)

        // var root = d3.stratify()
        //     .id((d)=>{return +d.id})
        //     .parentId((d)=>{if (d.parent_id>=0) return +d.parent_id})(data)
        // console.log("root", root);
        // // root.sum((d)=>{return d.value})

        // var root_id = root.data.id;
        // var treemap = d3.treemap()
        //     .size([REPLACE_ME_w, REPLACE_ME_h])
        //     .padding(REPLACE_ME_padding)

        // var nodes = treemap(root
        //     .sum((d)=> {
        //         var ret = 0
        //         if(d.parent_id == root_id)
        //             ret = d.value;
        //         console.log(d, ret)
        //         return ret;
        //     })
        //     .sort(function(a, b) { return b.height - a.height || b.value - a.value; }))
        //   .descendants();

        // console.log("treemap nodes", nodes)

        // g.selectAll("rect")
        //     .data(nodes)
        //     .enter()
        //     .append("rect")
        //     .attr('x', function (d) { return d.x0; })
        //     .attr('y', function (d) { return d.y0; })
        //     .attr('width', function (d) { return d.x1 - d.x0; })
        //     .attr('height', function (d) { return d.y1 - d.y0; })
        //     .style("stroke", "black")
        //     .style("fill", "#69b3a2");

        // g
        //     .selectAll("text")
        //     .data(nodes)
        //     .enter()
        //     .append("text")
        //     .attr("x", function(d){ return d.x0+10})    // +10 to adjust position (more right)
        //     .attr("y", function(d){ return d.y0+20})    // +20 to adjust position (lower)
        //     .text(function(d){ return d.data.label})
        //     .attr("font-size", "15px")
        //     .attr("fill", "white")
    }
}
function getRetainRenderer(zoomFactor) {
    var rendererBody = getBodyStringOfFunction(retainRenderer);
    rendererBody = rendererBody
        .replace(/REPLACE_ME_name/g, this.name)
        .replace(/REPLACE_ME_w/g, this.width)
        .replace(/REPLACE_ME_h/g, this.height)
        .replace(/REPLACE_ME_padding/g, this.padding)
        .replace(/REPLACE_ME_zoomFactor/g, zoomFactor);

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
            return b.height - a.height || b.value - a.value;
        });
        console.log("retain!!!:", data);

        var labels = g
            .selectAll("text")
            .data(data)
            .join("text")
            .classed("node label", true)
            .attr("x", d => +d.minx)
            .attr("y", d => +d.miny)
            .attr("dy", 15)
            .attr("dx", 3)
            .text(d => d.label + "\n" + d.value);
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
    getTransformFunc
};

module.exports = {
    Treemap,
    getTransformFunc,
    getRetainRenderer,
    getRenderer
};
