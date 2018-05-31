// setting up global variables
var globalVar = {};

// tile width and tile height
globalVar.tileW = 0;
globalVar.tileH = 0;

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
