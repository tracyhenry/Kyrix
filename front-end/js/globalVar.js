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
        canvasW: gvd.curCanvas.w,
        canvasH: gvd.curCanvas.h,
        viewportW: gvd.viewportWidth,
        viewportH: gvd.viewportHeight,
        predicates: predicateDict,
        renderingParams: globalVar.renderingParams
    };

    return optionalArgs;
}

// get SQL predicates from a predicate dictionary
function getSqlPredicate(p) {
    if ("==" in p) return "(" + p["=="][0] + "='" + p["=="][1] + "')";
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
