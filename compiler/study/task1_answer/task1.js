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


// construct a project
var p = new Project("task1", "../../../config.txt", 1000, 1000);

// construct canvases from top to bottom
var canvases = [];
for (var i = 0; i <= 1; i ++) {

    var width = 100000 * Math.pow(2, i);
    var height = 100000 * Math.pow(2, i);

    // construct a new canvas
    canvases[i] = new Canvas("level" + i, width, height);
    p.addCanvas(canvases[i]);

    // add a static layer
    var staticLayer = new Layer(transforms.emptyTransform, true);
    canvases[i].addLayer(staticLayer);
    staticLayer.addRenderingFunc(renderers.scPlotStaticTrim);

    // create one layer
    var curLayer = new Layer(transforms.scPlotTransform, false);
    canvases[i].addLayer(curLayer);
    curLayer.addPlacement(placements.scPlotPlacement);
    curLayer.addRenderingFunc(renderers.scPlotRendering);
}

// add literal zooms
p.addJump(new Jump(canvases[0], canvases[1], "", "", "", "literal_zoom_in"));
p.addJump(new Jump(canvases[1], canvases[0], "", "", "", "literal_zoom_out"));

// initialize canvas
p.initialCanvas(canvases[0], 1000, 1000, ["", ""]);

p.saveProject();
