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
var p = new Project("dots", "../../../config.txt", 1000, 1000);

// ================== Canvas dots ===================
var dotsCanvas = new Canvas("dots", 1000000, 100000);
p.addCanvas(dotsCanvas);

// dots layer
var dotsLayer = new Layer(transforms.idTransform, false);
dotsCanvas.addLayer(dotsLayer);
dotsLayer.addPlacement(placements.dotsPlacement);
dotsLayer.addRenderingFunc(renderers.dotsRendering);

// initialize canvas
p.setInitialStates(dotsCanvas, 3000, 3000, [""]);

// save to db
p.saveProject();
