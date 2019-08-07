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

    this.x = args.x || 5;
    this.y = args.y || 5;
    this.width = args.width || 1200;
    this.height = args.height || 800;
    this.padding = args.padding || 5;
    this.children = children;
    this.label = label;
    this.value = value;

    this.zoomFactor = args.zoomFactor || 1.5;

    // padding
    this.paddingOuter = args.paddingOuter || 5;
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
            colorInterpolator: args.colorInterpolator || "Warm"
            // colorInterpolator: args.colorInterpolator || "Viridis"
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
        // .domain(['a'.charCodeAt(0) , 'z'.charCodeAt(0)]);

        var opacity = d3
            .scaleLinear()
            .domain(0, d3.extent(d3.values(data.map(d => +d.value)))[1])
            .range([0.5, 1]);
        // console.log(color('a'))
        // console.log(color('abc'[1]))

        // var color =

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

        var clipPaths = g
            .selectAll("clipPath")
            .data(data)
            .join("clipPath")
            .attr("id", d => d.label + "_clip")
            .append("rect")
            .attr("x", d => d.minx)
            .attr("y", d => d.miny)
            .attr("width", d => d.w)
            .attr("height", d => d.h);

        var rects = nodes
            .append("rect")
            .attr("width", d => d.w)
            .attr("height", d => d.h)
            // .style("stroke", "black")
            .style("fill", d => color(d.depth))
            // .style("fill", (d)=> color(d.parent.toLowerCase().charCodeAt(0)))
            .style("opacity", 0.6);
        // .style("opacity", d => opacity(+d.value));
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
            return a.depth - b.depth || b.value - a.value;
        });
        // console.log("retain!!!:", data);

        g.selectAll("text.name")
            .data(data)
            .join("text")
            .classed("node name", true)
            .attr("clip-path", d => `url(#${d.label}_clip)`)
            .attr("x", d => +d.minx)
            .attr("y", d => +d.miny)
            .attr("dy", 13)
            .attr("dx", 3)
            .text(d => d.label);
        // labels
        //     .append("tspan")
        g.selectAll("text.value")
            .data(data)
            .join("text")
            .classed("node value", true)
            .attr("clip-path", d => `url(#${d.label}_clip)`)
            .attr("x", d => +d.minx)
            .attr("y", d => +d.miny)
            .attr("dy", 28)
            .attr("dx", 3)
            .text(d => d.value);
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
