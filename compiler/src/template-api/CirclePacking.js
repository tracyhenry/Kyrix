const getBodyStringOfFunction = require("./Renderers").getBodyStringOfFunction;
const textwrap = require("./Renderers").textwrap;

/*
 * Constructor of a zoomable circle packing
 * @param args
 * @constructor
 * by xinli on 09/02/19
 */
function CirclePacking(args) {
    args = args || {};

    // check required args
    var requiredArgs = ["data", "value", "children", "id"];
    var requiredArgsTypes = ["string", "string", "string", "string"];
    for (var i = 0; i < requiredArgs.length; i++) {
        if (!(requiredArgs[i] in args))
            throw new Error(
                "Constructing Treemap: " + requiredArgs[i] + " missing."
            );
        if (typeof args[requiredArgs[i]] !== requiredArgsTypes[i])
            throw new Error(
                "Constructing Treemap: " +
                    requiredArgs[i] +
                    " must be " +
                    requiredArgsTypes[i] +
                    "."
            );
        if (requiredArgsTypes[i] == "string")
            if (args[requiredArgs[i]].length == 0)
                throw new Error(
                    "Constructing Treemap: " +
                        requiredArgs[i] +
                        " cannot be an empty string."
                );
    }
    if (args.data.search(/(\.json)\s*$/) < 0)
        throw new Error("unsupported data file type");

    var name = args.name;
    var children = args.children;
    var id = args.id;
    var value = args.value;

    // this.name = "kyrix_treemap_" + rand;
    // this.data = data;
    this.filepath = process.cwd() + args.data.replace("./", "/");
    this.x = args.x || 0;
    this.y = args.y || 0;
    this.width = args.width || 1200;
    this.height = args.height || 800;
    this.padding = args.padding || 5;
    this.children = children;
    this.id = id;
    this.value = value;
    this.indexed = false;
    this.type = "circle packing";
    // this.ratio = (1 + Math.sqrt(5)) / 2;

    this.zoomFactor = args.zoomFactor || 2;

    this.viewW = args.viewW || 1200;
    this.viewH = args.viewH || 800;

    this.placement = {
        centroid_x: "col:x",
        centroid_y: "col:y",
        width: "col:w",
        height: "col:h"
    };

    this.transitions = args.transitions;

    // this.packSibling = function(siblings) {
    //     siblings = d3.packSibling(siblings);
    //     print(siblings);
    //     return siblings
    // }
}

function getOverviewScale(k) {
    var scaleBody = getBodyStringOfFunction(scaleFunc);
    scaleBody = scaleBody.replace(/REPLACE_ME_k/g, k);

    return new Function("x0, y0", scaleBody);

    function scaleFunc(x0, y0) {
        var k = REPLACE_ME_k;
        return {x: x0 / k, y: y0 / k};
    }
}

function getRenderer(level) {
    this.renderingParams[this.name].textwrap = textwrap;
    var rendererBody = getBodyStringOfFunction(renderer);
    rendererBody = rendererBody
        .replace(/REPLACE_ME_name/g, this.name)
        .replace(/REPLACE_ME_w/g, this.width)
        .replace(/REPLACE_ME_h/g, this.height)
        // .replace(/REPLACE_ME_padding/g, this.padding)
        .replace(/REPLACE_ME_level/g, level)
        .replace(/REPLACE_ME_zoomFactor/g, this.zoomFactor);

    return new Function("svg, data, rend_args", rendererBody);

    function renderer(svg, data, rend_args) {
        console.log("raw:", data);
        var params = rend_args.renderingParams["REPLACE_ME_name"];
        var g = svg
            .append("g")
            .classed("pack", true)
            .attr("id", "REPLACE_ME_name");

        // get root json from data, using d3-stratify
        // var table = [];
        // for (var i = 0; i < data.length; i++) {
        //     table.push(data[i]);
        //     // check if this one is root, if so, set its parent to -1
        //     var root = true;
        //     for (var j = 0; j < data.length; j++)
        //         if (i != j && data[j].id == data[i].parent) root = false;
        //     if (root) table[i].parent = -1;
        // }

        // calculate coordinates
        // var pack = d3.pack().size([REPLACE_ME_w, REPLACE_ME_h]);
        var root = d3
            .stratify()
            .id(function(d) {
                return d.id;
            })
            .parentId(function(d) {
                // return d.parent == -1 ? "" : d.parent;
                if (d.parent == "") return undefined;
            })(data);
        // root = d3
        //     .hierarchy(root)
        //     .sum(function(d) {
        //         return d.data.size;
        //     })
        //     .sort(function(a, b) {
        //         return b.value - a.value;
        //     });
        // root = pack(root).descendants();
        var arr = root.descendants();
        var dict = {};
        for (var i = 0; i < arr.length; i++) dict[arr[i].data.id] = arr[i];

        data.sort((a, b) => {
            return b.height - a.height || b.value - a.value;
        });

        // render
        g.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("r", function(d) {
                return d.r;
            })
            .attr("cx", function(d) {
                return d.x;
            })
            .attr("cy", function(d) {
                return d.y;
            });
        // .style("fill-opacity", 0.25)
        // .attr("fill", "honeydew")
        // .attr("stroke", "#ADADAD")
        // .style("stroke-width", "1px");
        g.selectAll("text")
            .data(data)
            .enter()
            .append("text")
            .classed("kyrix-retainsizezoom", true)
            .filter(function(d) {
                return !d.children;
            })
            .attr("dy", "0.3em")
            .text(function(d) {
                return d.name;
            })
            .attr("font-size", function(d) {
                return (d.r / 1000) * 300;
            })
            .attr("x", function(d) {
                return d.x;
            })
            .attr("y", function(d) {
                return d.y;
            })
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .style("fill-opacity", 1)
            .style("fill", "navy")
            .each(function(d) {
                params.textwrap(d3.select(this), d.r * 1.5);
            });
    }
}

function packSib(children) {
    // print("before:" + children[0]);
    children = d3.packSiblings(children);
    print("children.length:" + children.length);
    var parent = d3.packEnclose(children);
    // print("after:" + children[0]);
    // return children;
    // return parent;
}

// define prototype
CirclePacking.prototype = {
    getRenderer,
    getOverviewScale
};

module.exports = {
    CirclePacking,
    getOverviewScale,
    getRenderer,
    packSib
};
