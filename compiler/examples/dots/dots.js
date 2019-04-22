// libraries
const Project = require("../../src/index").Project;
const Canvas = require("../../src/Canvas").Canvas;
const Jump = require("../../src/Jump").Jump;
const Layer = require("../../src/Layer").Layer;
const View = require("../../src/View").View;

// project components
const renderers = require("./renderers");
const transforms = require("./transforms");
const placements = require("./placements");

// construct a project
var p = new Project("dots", "../../../config.txt");

// ================== top zoom level ===================
var topWidth = 1000000, topHeight = 1000000;
var topCanvas = new Canvas("top", topWidth, topHeight);
p.addCanvas(topCanvas);

// dots layer
var dotsLayer = new Layer(transforms.dotsTransform, false);
topCanvas.addLayer(dotsLayer);
dotsLayer.addPlacement(placements.dotsPlacement);
dotsLayer.addRenderingFunc(renderers.dotsRendering);

// ================== bottom zoom level ===================
var bottomCanvas = new Canvas("bottom", topWidth * 2, topHeight * 2);
p.addCanvas(bottomCanvas);
bottomCanvas.addLayer(dotsLayer);

// ================== Views ===================
var view = new View("dotview", 0, 0, 1000, 1000);
p.addView(view);
p.setInitialStates(view, topCanvas, 5000, 5000);

// save to db
p.saveProject();
