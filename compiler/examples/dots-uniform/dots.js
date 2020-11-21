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
var p = new Project("dots_uniform", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);

// ================== top zoom level ===================
var topWidth = renderers.topLevelWidth,
    topHeight = renderers.topLevelHeight;
var topCanvas = new Canvas("top", topWidth, topHeight);
topCanvas.addAxes(renderers.dotsAxes);
p.addCanvas(topCanvas);

// dots layer
var dotsLayer = new Layer(transforms.dotsTransform, false);
topCanvas.addLayer(dotsLayer);
dotsLayer.addPlacement(placements.dotsPlacement);
dotsLayer.addRenderingFunc(renderers.dotsRendering);

// ================== bottom zoom level ===================
var bottomCanvas = new Canvas("bottom", topWidth * 2, topHeight * 2);
bottomCanvas.addAxes(renderers.dotsAxes);
p.addCanvas(bottomCanvas);
bottomCanvas.addLayer(dotsLayer);

// ================== Views ===================
var view = new View("dotview", 1000, 1000);
p.addView(view);
p.setInitialStates(view, topCanvas, 5000, 5000);

// ================== Zooms ===================
p.addJump(new Jump(topCanvas, bottomCanvas, "literal_zoom_in"));
p.addJump(new Jump(bottomCanvas, topCanvas, "literal_zoom_out"));

// save to db
p.saveProject();
