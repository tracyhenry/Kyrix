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
                "Constructing CirclePacking: " + requiredArgs[i] + " missing."
            );
        if (typeof args[requiredArgs[i]] !== requiredArgsTypes[i])
            throw new Error(
                "Constructing CirclePacking: " +
                    requiredArgs[i] +
                    " must be " +
                    requiredArgsTypes[i] +
                    "."
            );
        if (requiredArgsTypes[i] == "string")
            if (args[requiredArgs[i]].length == 0)
                throw new Error(
                    "Constructing CirclePacking: " +
                        requiredArgs[i] +
                        " cannot be an empty string."
                );
    }
    if (args.data.search(/(\.json)\s*$/) < 0)
        throw new Error(
            "Constructing CirclePacking: unsupported data file type"
        );

    var children = args.children;
    var id = args.id;
    var value = args.value;

    this.filepath = args.data;
    this.width = "width" in args ? args.width : 1200;
    this.height = "height" in args ? args.height : 800;
    this.padding = "padding" in args ? args.padding : 0;
    this.children = children;
    this.id = id;
    this.value = value;
    this.type = "circle packing";

    this.zoomFactor = "zoomFactor" in args ? args.zoomFactor : 2;
    this.levelNumber = "levelNumber" in args ? args.levelNumber : 10;
    this.overviewLevel = "overviewLevel" in args ? args.overviewLevel : -2;
    this.threshold = "threshold" in args ? args.threshold : 8;

    this.placement = {
        centroid_x: "col:x",
        centroid_y: "col:y",
        width: "col:w",
        height: "col:h"
    };

    // TODO: allow user to customize transition (this.transitions = args.transitions;)
}

function getOverviewScale(k) {
    function scaleFunc(x0, y0) {
        var k = REPLACE_ME_k;
        return {x: x0 / k, y: y0 / k};
    }

    var scaleBody = getBodyStringOfFunction(scaleFunc);
    scaleBody = scaleBody.replace(/REPLACE_ME_k/g, k);

    return new Function("x0, y0", scaleBody);
}

function getRenderer(level) {
    function renderer(svg, data, rend_args) {
        var params = rend_args.renderingParams["REPLACE_ME_name"];
        var g = svg
            .append("g")
            .classed("pack", true)
            .attr("id", "REPLACE_ME_name");

        var maxD = Math.max.apply(
            Math,
            data.map(function(o) {
                return o.depth;
            })
        );

        var sort = (a, b) => {
            return b.height - a.height || b.value - a.value;
        };

        color = d3
            .scaleLinear()
            .domain([0, maxD > 5 ? maxD : 5])
            .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
            .interpolate(d3.interpolateHcl);

        var gvd = globalVar.views[rend_args.viewId];
        var renderData = gvd.renderData[rend_args.layerId];
        var root = d3
            .stratify()
            .id(function(d) {
                return d.id;
            })
            .parentId(function(d) {
                if (+d.parent < 0) return undefined;
                else return d.parent;
            })(renderData);
        // console.log("root:", root);
        // console.log("maxD:", maxD);

        var arr = root.descendants();
        var dict = {};
        for (var i = 0; i < arr.length; i++) dict[arr[i].data.id] = arr[i];

        data.sort(sort);

        var flagNew = function(d) {
            var r = +d.w / 2;
            var flag = r / REPLACE_ME_zoomFactor < REPLACE_ME_threshold;
            return flag;
        };

        var flagNewText = function(d) {
            var flag = ((d.w / 2 / 1000) * 300) / REPLACE_ME_zoomFactor < 8;
            return flag;
        };

        var flagColorShift = function(d) {
            if (flagNew(d)) return false;
            var node = dict[d.id];
            if (!node.children > 0 || node.children.length <= 0) return false;
            for (var i in node.children) {
                if (!flagNew(node.children[i].data)) return false;
            }
            return true;
        };

        // render
        var circles = g
            .selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("r", function(d) {
                if (!flagNew(d)) return d.w / 2;
                else return 1e-2;
            })
            .attr("cx", function(d) {
                return +d.x;
            })
            .attr("cy", function(d) {
                return +d.y;
            })
            .style("fill", d => {
                return d.count > 0 && !flagColorShift(d)
                    ? color(d.depth)
                    : "white";
            });

        var texts = g
            .selectAll("text")
            .data(data)
            .enter()
            .append("text")
            .filter(function(d) {
                return d.count == 0 && (d.w / 2 / 1000) * 300 > 8;
            })
            .attr("dy", "0.3em")
            .text(function(d) {
                return d.name;
            })
            .attr("font-size", function(d) {
                return (d.w / 2 / 1000) * 300;
            })
            .attr("x", function(d) {
                return +d.x;
            })
            .attr("y", function(d) {
                return +d.y;
            })
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")
            .style("fill-opacity", d => {
                if (flagNew(d) || flagNewText(d)) return 0;
                else return 1;
            })
            .style("fill", "navy")
            .each(function(d) {
                rend_args.renderingParams.textwrap(
                    d3.select(this),
                    (d.w / 2) * 1.5
                );
            });

        circles
            .filter(flagColorShift)
            .sort(sort)
            .transition()
            .delay((d, i, nodes) => (i * 1500) / nodes.length)
            .duration(1000)
            .style("fill", d => color(d.depth));

        var size_new = circles
            .filter(flagNew)
            .sort(sort)
            .transition()
            .delay((d, i, nodes) => (i * 1500) / nodes.length)
            .duration(1000)
            .attr("r", d => +d.w / 2)
            .size();

        texts
            .filter(d => flagNew(d) || flagNewText(d))
            .sort(sort)
            .transition()
            .delay((d, i, nodes) => 1500 + (i * 500) / nodes.length)
            .duration(800)
            .style("fill-opacity", 1);

        circles
            .on("mouseover.tooltip", function(d, i) {
                // highlight
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

        function addTooltip(d, i) {
            var node = dict[d.id];
            var ancestors = node.ancestors().reverse();
            var breadcrumb = ancestors
                .map(item => item.data.name)
                .join("/")
                .replace(/-\//g, "/");
            var tooltip = d3
                .select("body")
                .append("div")
                .attr("id", "mapTooltip" + i)
                .classed("tooltip card bg-lite mapTooltip", true)
                .style("pointer-events", "none")
                .style("opacity", 0)
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
    }

    this.renderingParams.textwrap = textwrap;
    var rendererBody = getBodyStringOfFunction(renderer);
    var zoomCoef = this.getZoomCoef(level);
    rendererBody = rendererBody
        .replace(/REPLACE_ME_name/g, this.name)
        .replace(/REPLACE_ME_w/g, this.width)
        .replace(/REPLACE_ME_h/g, this.height)
        .replace(/REPLACE_ME_zoomCoef/g, zoomCoef)
        .replace(/REPLACE_ME_zoomFactor/g, this.zoomFactor)
        .replace(/REPLACE_ME_threshold/g, this.threshold);

    return new Function("svg, data, rend_args", rendererBody);
}

function getZoomCoef(level) {
    return Math.pow(this.zoomFactor, level);
}

//TODO: load to current level
function getLoadObject(level) {
    var zoomCoef = this.getZoomCoef(level + 2);

    function viewportFunc(row) {
        return {
            constant: [row.x * REPLACE_ME_zoomCoef, row.y * REPLACE_ME_zoomCoef]
        };
    }

    var viewportBody = getBodyStringOfFunction(viewportFunc);
    viewportBody = viewportBody.replace(/REPLACE_ME_zoomCoef/g, zoomCoef);

    var viewport = new Function("row", viewportBody);

    var selector = function() {
        return true;
    };

    var predicates = function(row) {
        return {};
    };

    var name = function(row) {
        var str = "see more around " + row.id + "";
        return str;
    };

    var ret = {
        selector,
        predicates,
        name,
        viewport,
        noPrefix: true
    };

    return ret;
}

function packSib(children) {
    // var fun2 = function (object) {
    //     print("JS Class Definition: " + Object.prototype.toString.call(object));
    // };
    // print("before:" + children);
    var jschildren = Java.from(children, "java.util.ArrayList");
    children = d3.packSiblings(children);
    var jsparent = d3.packEnclose(jschildren);
    // print("after jsparent:" + jsparent);

    return jsparent;
}

// define prototype
CirclePacking.prototype = {
    getRenderer,
    getZoomCoef,
    getLoadObject,
    getOverviewScale
};

module.exports = {
    CirclePacking,
    getOverviewScale,
    getRenderer,
    packSib
};
