// this file has all rendering templates
// in the future if it grows to be too large, we can consider splitting it into multiple files

/**
 * this function wraps a @text svg element into a box with @width pixels wide
 * useful for displaying long text, used in both NBA and Flare
 * modified from https://bl.ocks.org/mbostock/7555321
 * @param text
 * @param width
 */
function textwrap(text, width) {
    text.each(function() {
        var text = d3.select(this),
            words = text
                .text()
                .split(/(?=[A-Z])/)
                .reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.3, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = null;

        text.text(null);
        while ((word = words.pop())) {
            if (line.length == 0)
                tspan = text
                    .append("tspan")
                    .attr("x", x)
                    .attr("y", y);
            line.push(word);
            tspan.text(line.join(""));
            if (tspan.node().getComputedTextLength() > width) {
                var popped = false;
                if (line.length > 1) {
                    line.pop();
                    popped = true;
                }
                tspan.text(line.join(""));
                if (popped) {
                    line = [word];
                    tspan = text
                        .append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .text(word);
                } else line = [];
            }
        }
        var tspans = text.selectAll("tspan"),
            num_tspans = tspans.size();
        var firstY;
        if (num_tspans % 2 == 0) firstY = -(num_tspans / 2 - 0.5) * lineHeight;
        else firstY = -Math.floor(num_tspans / 2) * lineHeight;
        tspans.attr("dy", function(d, i) {
            return firstY + lineHeight * i + 0.3 + "em";
        });
    });
}

/**
 * serialize the body of a function into a string
 * @param func
 * @returns {string}
 */
function getBodyStringOfFunction(func) {
    var funcStr = func.toString();
    const bodyStart = funcStr.indexOf("{") + 1;
    const bodyEnd = funcStr.lastIndexOf("}");
    return "\n" + funcStr.substring(bodyStart, bodyEnd) + "\n";
}

/**
 * setting the values of a dictionary if they don't exist yet
 * @param dict
 * @param properties
 */
function setPropertiesIfNotExists(dict, properties) {
    var keys = Object.keys(properties);
    for (var i = 0; i < keys.length; i++)
        if (!(keys[i] in dict)) dict[keys[i]] = properties[keys[i]];
}

/**
 * parse an svg path data string. Generates an Array
 * of commands where each command is an Array of the
 * form `[command, arg1, arg2, ...]`
 *
 * @param {String} path
 * @return {Array}
 */
function parsePathIntoSegments(path) {
    function parseValues(args) {
        var number = /-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/gi;
        var numbers = args.match(number);
        return numbers ? numbers.map(Number) : [];
    }
    var length = {
        a: 7,
        c: 6,
        h: 1,
        l: 2,
        m: 2,
        q: 4,
        s: 4,
        t: 2,
        v: 1,
        z: 0
    };
    var segment = /([astvzqmhlc])([^astvzqmhlc]*)/gi;
    var data = [];
    path.replace(segment, function(_, command, args) {
        var type = command.toLowerCase();
        args = parseValues(args);

        // overloaded moveTo
        if (type == "m" && args.length > 2) {
            data.push([command].concat(args.splice(0, 2)));
            type = "l";
            command = command == "m" ? "l" : "L";
        }

        while (true) {
            if (args.length == length[type]) {
                args.unshift(command);
                return data.push(args);
            }
            if (args.length < length[type])
                throw new Error("malformed path data");
            data.push([command].concat(args.splice(0, length[type])));
        }
    });
    return data;
}

/**
 * translate a path segment list (see parsePathIntoSegments)
 * this is useful because translation on path is often needed
 * but directly adding transform to svg paths is not supported
 * very well in Kyrix
 * @param segments
 * @param x
 * @param y
 * @returns {*|{}|Uint8Array|any[]|Int32Array|Uint16Array}
 */
function translatePathSegments(segments, x, y) {
    // y is optional
    y = y || 0;

    return segments.map(function(segment) {
        var cmd = segment[0];

        // Shift coords only for commands with absolute values
        if ("ACHLMRQSTVZ".indexOf(cmd) === -1) {
            return segment;
        }

        var name = cmd.toLowerCase();

        // V is the only command, with shifted coords parity
        if (name === "v") {
            segment[1] = Number(segment[1]) + +y;
            return segment;
        }

        // ARC is: ['A', rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
        // touch x, y only
        if (name === "a") {
            segment[6] = Number(segment[6]) + +x;
            segment[7] = Number(segment[7]) + +y;
            return segment;
        }

        // All other commands have [cmd, x1, y1, x2, y2, x3, y3, ...] format
        return segment.map(function(val, i) {
            if (!i) {
                return val;
            }
            return i % 2 ? Number(val) + +x : Number(val) + +y;
        });
    });
}

/**
 * Serialize a path segment list into strings
 * @param path
 */
function serializePath(path) {
    return path.reduce(function(str, seg) {
        return str + seg[0] + seg.slice(1).join(",");
    }, "");
}

/**
 * PLV8 function used by the AutoDDCitusIndexer to calculate Citus
 * hash keys that result in spatial partitions
 * @param cx
 * @param cy
 * @param partitions
 * @param hashkeys
 * @returns {*}
 */
function autoDDGetCitusSpatialHashKey(cx, cy) {
    if (!("partitions" in plv8)) plv8.partitions = REPLACE_ME_partitions;
    if (!("hashkeys" in plv8)) plv8.hashkeys = REPLACE_ME_hashkeys;

    var partitions = plv8.partitions;
    var hashkeys = plv8.hashkeys;
    for (var i = 0; i < partitions.length; i++)
        if (
            cx >= partitions[i][0] &&
            cx <= partitions[i][2] &&
            cy >= partitions[i][1] &&
            cy <= partitions[i][3]
        )
            return hashkeys[i];
    return -1;
}

/**
 * PLV8 function used by the AutoDDCitusIndexer for hierarchical clustering
 * @param clusters
 * @param autodd
 */
function autoDDSingleNodeClustering(clusters, autodd) {
    // get d3
    if (!("d3" in plv8)) {
        plv8.d3 = require("d3");
    }
    var d3 = plv8.d3;

    // sort by importance
    var zOrder = autodd.zOrder;
    var zCol = autodd.zCol;
    clusters.sort(function(a, b) {
        if (zOrder == "asc") return a[zCol] - b[zCol];
        else return b[zCol] - a[zCol];
    });

    // initialize a quadtree for existing clusters
    var zoomFactor = autodd.zoomFactor;
    var theta = autodd.theta;
    var bboxH = autodd.bboxH,
        bboxW = autodd.bboxW;
    var radius = d3.max([bboxH, bboxW]) * theta;
    var qt = d3
        .quadtree()
        .x(function x(d) {
            return d.cx;
        })
        .y(function y(d) {
            return d.cy;
        });
    for (var i = 0; i < clusters.length; i++) {
        var x = clusters[i].cx / zoomFactor;
        var y = clusters[i].cy / zoomFactor;
        var nn = qt.find(x, y, radius);
        if (
            nn != null &&
            d3.max([
                Math.abs(x - nn.cx) / bboxW,
                Math.abs(y - nn.cy) / bboxH
            ]) <= theta
        ) {
            // merge cluster
            var betaClusterAgg = JSON.parse(nn.cluster_agg);
            var alphaClusterAgg = JSON.parse(clusters[i].cluster_agg);
            betaClusterAgg.count += alphaClusterAgg.count;
            nn.cluster_agg = JSON.stringify(betaClusterAgg);
        } else {
            var newCluster = JSON.parse(JSON.stringify(clusters[i]));
            newCluster.cx /= zoomFactor;
            newCluster.cy /= zoomFactor;
            qt.add(newCluster);
        }
    }
    return qt.data();
}

function autoDDMergeClustersAlongSplits(clusters, autodd) {
    var theta = autodd.theta;
    var zCol = autodd.zCol;
    var zOrder = autodd.zOrder;
    var bboxW = autodd.bboxW;
    var bboxH = autodd.bboxH;
    var dir = autodd.splitDir;
    clusters.sort(function(a, b) {
        if (dir == "vertical") return a.cy - b.cy;
        else return a.cx - b.cx;
    });

    var res = [JSON.parse(JSON.stringify(clusters[0]))];
    for (var i = 1; i < clusters.length; i++) {
        var beta = clusters[i];
        var alpha = res[res.length - 1];
        var ncd = Math.max(
            Math.abs(alpha.cx - beta.cx) / bboxW,
            Math.abs(alpha.cy - beta.cy) / bboxH
        );
        if (ncd >= theta)
            // no conflict
            res.push(JSON.parse(JSON.stringify(beta)));
        else {
            // merge alpha and beta
            var alphaClusterAgg = JSON.parse(alpha.cluster_agg);
            var betaClusterAgg = JSON.parse(beta.cluster_agg);

            // merge according to importance order
            if (
                (+alpha[zCol] > +beta[zCol] && zOrder == "desc") ||
                (+alpha[zCol] < +beta[zCol] && zOrder == "asc")
            ) {
                alphaClusterAgg.count += betaClusterAgg.count;
                alpha.cluster_agg = JSON.stringify(alphaClusterAgg);
            } else {
                betaClusterAgg.count += alphaClusterAgg.count;
                beta.cluster_agg = JSON.stringify(betaClusterAgg);
                res[res.length - 1] = JSON.parse(JSON.stringify(beta));
            }
        }
    }

    return res;
}

module.exports = {
    textwrap,
    getBodyStringOfFunction,
    setPropertiesIfNotExists,
    parsePathIntoSegments,
    translatePathSegments,
    serializePath,
    autoDDGetCitusSpatialHashKey,
    autoDDSingleNodeClustering,
    autoDDMergeClustersAlongSplits
};
