// setting up global variables
var globalVar = {};

// kyrix backend url
globalVar.serverAddr = "N/A";

// tile width and tile height
globalVar.tileW = 0;
globalVar.tileH = 0;

// cache
globalVar.cachedCanvases = {};

// global rendering params (specified by the developer)
globalVar.renderingParams = null;

// global var dictionaries for views
globalVar.views = {};

// globalVar project
globalVar.project = null;

if (typeof String.prototype.parseFunction != "function") {
    String.prototype.parseFunction = function() {
        var funcReg = /function *[^()]*\(([^()]*)\)[ \n\t]*\{([\s\S]*)\}/gim;
        var match = funcReg.exec(this);
        if (match) return new Function(match[1].split(","), match[2]);
        else return null;
    };
}

/****************** common functions ******************/
function getOptionalArgs(viewId) {
    var gvd = globalVar.views[viewId];
    var predicateDict = {};
    for (var i = 0; i < gvd.predicates.length; i++)
        predicateDict["layer" + i] = gvd.predicates[i];
    var optionalArgs = {
        canvasId: gvd.curCanvas.id,
        canvasW: gvd.curCanvas.w,
        canvasH: gvd.curCanvas.h,
        pyramidLevel: gvd.curCanvas.pyramidLevel,
        viewportW: gvd.viewportWidth,
        viewportH: gvd.viewportHeight,
        predicates: predicateDict,
        tileW: globalVar.tileW,
        tileH: globalVar.tileH,
        viewId: viewId,
        renderingParams: globalVar.renderingParams
    };

    return optionalArgs;
}

// get SQL predicates from a predicate dictionary
function getSqlPredicate(p) {
    if ("==" in p)
        return (
            "(" +
            p["=="][0].toString().replace(/&/g, "%26") +
            "='" +
            p["=="][1].toString().replace(/&/g, "%26") +
            "')"
        );
    if ("AND" in p)
        return (
            "(" +
            getSqlPredicate(p["AND"][0]) +
            " AND " +
            getSqlPredicate(p["AND"][1]) +
            ")"
        );
    if ("OR" in p)
        return (
            "(" +
            getSqlPredicate(p["OR"][0]) +
            " OR " +
            getSqlPredicate(p["OR"][1]) +
            ")"
        );
    return "";
}

// check whether a given datum passes a filter
function isHighlighted(d, p) {
    if (p == null || p == {}) return true;
    if ("==" in p) return d[p["=="][0]] == p["=="][1];
    if ("AND" in p)
        return isHighlighted(d, p["AND"][0]) && isHighlighted(d, p["AND"][1]);
    if ("OR" in p)
        return isHighlighted(d, p["OR"][0]) || isHighlighted(d, p["OR"][1]);

    return false;
}

// get a canvas object by a canvas ID
function getCanvasById(canvasId) {
    for (var i = 0; i < globalVar.project.canvases.length; i++)
        if (globalVar.project.canvases[i].id == canvasId)
            return globalVar.project.canvases[i];

    return null;
}

// get jumps starting from a canvas
function getJumpsByCanvasId(canvasId) {
    var jumps = [];
    for (var i = 0; i < globalVar.project.jumps.length; i++)
        if (globalVar.project.jumps[i].sourceId == canvasId)
            jumps.push(globalVar.project.jumps[i]);

    return jumps;
}

// make tooltips after rendering functions are called
function makeTooltips(selection, columns, aliases) {
    var createTooltip = function(d) {
        if (d == null || typeof d !== "object") return;
        // remove all tool tips first
        d3.select("body")
            .selectAll(".kyrixtooltip")
            .remove();
        // create a new tooltip
        var tooltip = d3
            .select("body")
            .append("table")
            .classed("kyrixtooltip", true)
            .style("background", "#FFF")
            .style("border-radius", "3px")
            .style("position", "absolute")
            .style("box-shadow", "2px 2px #888888")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("font-size", "13px")
            .style("font-family", "Open Sans")
            .style("left", d3.event.pageX + "px")
            .style("top", d3.event.pageY + "px");
        var rows = tooltip
            .selectAll(".kyrix-tooltip-rows")
            .data(columns)
            .join("tr");
        // column names
        rows.append("td")
            .html((p, j) => aliases[j] + ":")
            .style("padding-left", "10px")
            .style("padding-right", "2px")
            .style("padding-top", (p, i) => (i == 0 ? "10px" : "1px"))
            .style("padding-bottom", (p, i) =>
                i == columns.length - 1 ? "10px" : "1px"
            );

        // column values
        rows.append("td")
            .html(function(p) {
                if (
                    (typeof d[p] == "number" ||
                        (typeof d[p] == "string" && d[p].length > 0)) &&
                    !isNaN(d[p])
                )
                    return d3.format(",.2f")(d[p]);
                else return d[p];
            })
            .style("font-weight", "900")
            .style("padding-left", "2px")
            .style("padding-right", "10px")
            .style("padding-top", (p, i) => (i == 0 ? "10px" : "1px"))
            .style("padding-bottom", (p, i) =>
                i == columns.length - 1 ? "10px" : "1px"
            );

        // fade in
        tooltip
            .transition()
            .duration(200)
            .style("opacity", 0.9);
    };

    selection
        .on("mouseover.kyrixtooltip", d => createTooltip(d))
        .on("mousemove.kyrixtooltip", function(d) {
            if (d == null || typeof d !== "object") return;
            d3.select(".kyrixtooltip")
                .style("left", d3.event.pageX + "px")
                .style("top", d3.event.pageY + "px");
        })
        .on("mouseout.kyrixtooltip", function(d) {
            if (d == null || typeof d !== "object") return;
            d3.select(".kyrixtooltip").remove();
        });
}
