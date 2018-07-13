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
var p = new Project("forest", "../../../config.txt", 800, 800);
p.addRenderingParams(renderers.renderingParams);

// ================== Canvas 1 ===================
var c1BackgroundCanvas = new Canvas("c1Background", 2548, 976);
p.addCanvas(c1BackgroundCanvas);

// add data transforms
c1BackgroundCanvas.addTransform(transforms.backgroundTransform);

// bg layer
var c1BackgroundLayer = new Layer("background", false);
c1BackgroundCanvas.addLayer(c1BackgroundLayer);
c1BackgroundLayer.addPlacement(placements.c1BackgroundPlacement);
c1BackgroundLayer.addRenderingFunc(renderers.backgroundRendering);

// ================== Canvas 2 ===================
var c2BackgroundCanvas = new Canvas("c2Background", 10192, 3904);
p.addCanvas(c2BackgroundCanvas);

// add data transforms
c2BackgroundCanvas.addTransform(transforms.backgroundTransform);

// bg layer
var c2BackgroundLayer = new Layer("background", false);
c2BackgroundCanvas.addLayer(c2BackgroundLayer);
c2BackgroundLayer.addPlacement(placements.c2BackgroundPlacement);
c2BackgroundLayer.addRenderingFunc(renderers.backgroundRendering);

// ================== Canvas 1 -> Canvas 2 ===================

p.addJump(new Jump("c1Background", "c2Background", 0, "","", "literal_zoom_in"));
p.addJump(new Jump("c2Background", "c1Background", 0, "","", "literal_zoom_out"));

// initialize canvas
p.initialCanvas("c1Background", 0, 0, [""]);

// save to db
p.saveProject();
