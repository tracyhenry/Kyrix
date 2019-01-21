// setting up global variables
var globalVar = {};

// tile width and tile height
globalVar.tileW = 0;
globalVar.tileH = 0;

// render data
globalVar.renderData = null;

// whether there is a pending box request
globalVar.pendingBoxRequest = false;

// current viewport info
globalVar.initialViewportX = 0;
globalVar.initialViewportY = 0;
globalVar.viewportWidth = 0;
globalVar.viewportHeight = 0;

// predicates of the current canvas, used to retrieve data from backend
globalVar.predicates = [];

// the id of the current canvas
globalVar.curCanvasId = "";

// current canvas & jump object;
globalVar.curCanvas = null;
globalVar.curJump = null;
globalVar.curStaticData = null;

// history
globalVar.history = [];

// whether there is a zooming animation happening
globalVar.animation = false;

// cache
globalVar.cachedCanvases = {};

// global rendering params (specified by the developer)
globalVar.renderingParams = null;

if (typeof String.prototype.parseFunction != 'function') {
    String.prototype.parseFunction = function () {
        var funcReg = /function *[^()]*\(([^()]*)\)[ \n\t]*\{([\s\S]*)\}/gmi;
        var match = funcReg.exec(this);
        if(match)
            return new Function(match[1].split(','), match[2]);
        else
            return null;
    };
}

/******** common functions ********/
function getOptionalArgs() {

    var predicateDict = {};
    for (var i = 0; i < globalVar.predicates.length; i ++)
        predicateDict["layer" + i] = globalVar.predicates[i];
    var optionalArgs = {canvasW : globalVar.curCanvas.w, canvasH : globalVar.curCanvas.h,
        viewportW : globalVar.viewportWidth, viewportH : globalVar.viewportHeight,
        predicates : predicateDict, renderingParams : globalVar.renderingParams};

    return optionalArgs;
}

function getSqlPredicate(p) {

    if ("==" in p)
        return "(" + p["=="][0] + "=\'" + p["=="][1] + "\')";
    if ("AND" in p)
        return "(" + getSqlPredicate(p["AND"][0]) + " AND "
            + getSqlPredicate(p["AND"][1]) + ")";
    if ("OR" in p)
        return "(" + getSqlPredicate(p["OR"][0]) + " OR "
            + getSqlPredicate(p["OR"][1]) + ")";
    return "";
}

function getCanvasById(canvasId) {

    for (var i = 0; i < globalVar.project.canvases.length; i ++)
        if (globalVar.project.canvases[i].id == canvasId)
            return globalVar.project.canvases[i];

    return null;
}