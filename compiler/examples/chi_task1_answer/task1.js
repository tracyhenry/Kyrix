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
var p = new Project("chi_task1", "../../../config.txt", 1000, 1000);

// construct canvases from top to bottom
for (var i = 0; i <= 1; i ++) {

    var width = 100000 * Math.pow(2, i);
    var height = 100000 * Math.pow(2, i);

    // construct a new canvas
    var curCanvas = new Canvas("level" + i, width, height);
    p.addCanvas(curCanvas);

    // add data transforms
    curCanvas.addTransform(transforms.scPlotTransform);
    curCanvas.addTransform(transforms.emptyTransform);

    // add a static layer
    var staticLayer = new Layer("empty", true);
    curCanvas.addLayer(staticLayer);
    staticLayer.addRenderingFunc(renderers.scPlotStaticTrim);

    // create one layer
    var curLayer = new Layer("scalexy", false);
    curCanvas.addLayer(curLayer);
    curLayer.addPlacement(placements.scPlotPlacement);
    curLayer.addRenderingFunc(renderers.scPlotRendering);
}

// add literal zooms
p.addJump(new Jump("level0", "level1", "", "", "", "literal_zoom_in"));
p.addJump(new Jump("level1", "level0", "", "", "", "literal_zoom_out"));

// initialize canvas
p.initialCanvas("level0", 1000, 1000, ["", ""]);

p.saveProject();
