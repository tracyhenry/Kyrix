// setting up global variables
var globalVar = {};

// cache
globalVar.cachedCanvases = {};

// number of views
globalVar.numViews = 3;

// view array
globalVar.views = [];
for (var i = 0; i < globalVar.numViews; i ++) {

    globalVar.views.push({});
    var globalVarDict = globalVar.views[i];

    // dynamic box coor and size
    globalVarDict.boxX = 0;
    globalVarDict.boxY = 0;
    globalVarDict.boxH = 0;
    globalVarDict.boxW = 0;
    globalVarDict.renderData = null;

    // whether there is a pending box request
    globalVarDict.pendingBoxRequest = false;

    // whether there is already a box request sent for the current canvas
    globalVarDict.hasBox = false;

    // current viewport info
    globalVarDict.initialViewportX = 0;
    globalVarDict.initialViewportY = 0;
    globalVarDict.viewportWidth = 0;
    globalVarDict.viewportHeight = 0;

    // predicates of the current canvas, used to retrieve data from backend
    globalVarDict.predicates = [];

    // the id of the current canvas
    globalVarDict.curCanvasId = "";

    // current canvas & jump object;
    globalVarDict.curCanvas = null;
    globalVarDict.curJump = null;
    globalVarDict.curStaticData = null;
}

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
