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
var p = new Project("lzoomscatterplotsingleaxis", "../../../config.txt", 800, 800);

// construct canvases from top to bottom
var topLevelWidth = 1000;
var topLevelHeight = 800;
var canvases = [];

// create canvases
for (var i = 0; i < numLevels; i ++) {
    var width = topLevelWidth * Math.pow(zoomFactor, i);
    var height = topLevelHeight;

    // construct a new canvas
    var curCanvas = new Canvas("level" + i, width, height);
    canvases.push(curCanvas);
    p.addCanvas(curCanvas);

    // add axis
    curCanvas.addAxes(renderers.scPlotAxes);

    // add a static layer
    var staticLayer = new Layer(transforms.emptyTransform, true);
    curCanvas.addLayer(staticLayer);
    staticLayer.addRenderingFunc(renderers.scPlotStaticTrim);

    // create one layer
    var curLayer = new Layer(transforms.scales[i]);
    curCanvas.addLayer(curLayer);
    curLayer.addPlacement(placements.scPlotPlacement);
    curLayer.addRenderingFunc(renderers.scPlotRendering);
}

// add literal zooms
for (var i = 0; i + 1 < numLevels; i ++) {
    p.addJump(new Jump(canvases[i], canvases[i + 1], "", "", "", "literal_zoom_in"));
    p.addJump(new Jump(canvases[i + 1], canvases[i], "", "", "", "literal_zoom_out"));
}

// initialize canvas
p.setInitialStates(canvases[0], 200, 0, ["", ""]);

p.saveProject();
