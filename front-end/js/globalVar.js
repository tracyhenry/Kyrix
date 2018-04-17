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
globalVar.curCanvas = {};
globalVar.curJump = {};

// d3 zoom
globalVar.zoom = d3.zoom()
    .scaleExtent([1, 1])
    .on("zoom", zoomed);

// container svg
globalVar.containerSvg = d3.select("body").append("svg")
    .attr("id", "containerSvg")
    .style("display", "block")
    .style("margin", "auto");

// div for jump options
globalVar.jumpOptions = d3.select("body").append("div")
    .style("margin-bottom", "40px")
    .style("text-align", "center");


if (typeof String.prototype.parseFunction != 'function') {
    String.prototype.parseFunction = function () {
        var funcReg = /function *[^()]*\(([^()]*)\)[ \n\t]*\{(.*)\}/gmi;
        var match = funcReg.exec(this.replace(/\n/g, ' '));
        if(match)
            return new Function(match[1].split(','), match[2]);
        else
            return null;
    };
}
