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
var viewportWidth = 500;
var viewportHeight = 1000;
var p = new Project("cluster", "../../../config.txt", viewportWidth, viewportHeight);

// ================== cluster canvases ===============
var width = 500;
var height = 1000;
var clusterCanvases = [];

// cluster parameters
var numLevels = 7;
var zoomFactor;

for (var i = 0; i < numLevels; i ++) {

    // construct a new canvas
    var curCanvas = new Canvas("level" + i, width, height);
    clusterCanvases.push(curCanvas);
    p.addCanvas(curCanvas);

    // create one layer
    var curLayer = new Layer(transforms.scales[i], false);
    curCanvas.addLayer(curLayer);
    curLayer.addPlacement(placements.clusterPlacement);
    curLayer.addRenderingFunc(renderers.clusterRendering);

    curCanvas.addAxes(renderers.clusterAxes);

    // calculate width & height for the next level
    if (i <= 1)
        zoomFactor = 8;
    else
        zoomFactor = 3;
    width = width * zoomFactor;
    height = height * zoomFactor;
}

for (var i = 0; i + 1 < numLevels; i ++) {
    p.addJump(new Jump(clusterCanvases[i], clusterCanvases[i + 1], "", "", "", "literal_zoom_in"));
    p.addJump(new Jump(clusterCanvases[i + 1], clusterCanvases[i], "", "", "", "literal_zoom_out"));
}

// set initial states
p.setInitialStates(clusterCanvases[0], 0, 0, [""]);

// save to database
p.saveProject();
