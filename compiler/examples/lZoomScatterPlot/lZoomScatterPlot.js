// libraries
const index = require("../../src/index");
const Project = index.Project;
const Canvas = index.Canvas;
const Layer = index.Layer;
const Jump = index.Jump;

// project components
const renderers = require("./renderers");
const transforms = require("./transforms");
const placements = require("./placements");

// project parameters
const numLevels = transforms.numLevels;
const zoomFactor = transforms.zoomFactor;

// construct a project
var p = new Project("lzoomscatterplot", "../../dbconfig.txt", 800, 800);

// construct canvases from top to bottom
var topLevelWidth = 1000;
var topLevelHeight = 1000;

// create canvases
for (var i = 0; i < numLevels; i ++) {
    var width = topLevelWidth * Math.pow(zoomFactor, i);
    var height = topLevelHeight * Math.pow(zoomFactor, i);

    // construct a new canvas
    var curCanvas = new Canvas("level" + i, width, height);
    p.addCanvas(curCanvas);

    // add data transforms
    curCanvas.addTransform(transforms.scales[i]);

    // create one layer
    var curLayer = new Layer("scalexy");
    curCanvas.addLayer(curLayer);
    curLayer.addPlacement(placements.scPlotPlacement);
    curLayer.addRenderingFunc(renderers.scPlotRendering);
}

// add literal zooms
for (var i = 0; i + 1 < numLevels; i ++)
    p.addJump(new Jump("level" + i, "level" + (i + 1), [""], [""], "literal_zoom"));

// initialize canvas
p.initialCanvas("level0", 200, 200, [""]);

p.saveToDb();
