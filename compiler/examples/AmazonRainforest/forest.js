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
var p = new Project("forest", "../../../config.txt", 1400, 800);
p.addRenderingParams(renderers.renderingParams);

// ================== Canvas 1 ===================
var c1BackgroundCanvas = new Canvas("c1Background", 2548, 976);
p.addCanvas(c1BackgroundCanvas);

// add data transforms
c1BackgroundCanvas.addTransform(transforms.c1BackgroundTransform);
c1BackgroundCanvas.addTransform(transforms.c1AnimalTransform);

// animal layer
var c1AnimalLayer = new Layer("c1animal", false);
c1BackgroundCanvas.addLayer(c1AnimalLayer);
c1AnimalLayer.addPlacement(placements.c1AnimalPlacement);
c1AnimalLayer.addRenderingFunc(renderers.animalCircleRendering);

// bg layer
var c1BackgroundLayer = new Layer("c1background", false);
c1BackgroundCanvas.addLayer(c1BackgroundLayer);
c1BackgroundLayer.addPlacement(placements.c1BackgroundPlacement);
c1BackgroundLayer.addRenderingFunc(renderers.backgroundRendering);

// ================== Canvas 2 ===================
var c2BackgroundCanvas = new Canvas("c2Background", 10192, 3904);
p.addCanvas(c2BackgroundCanvas);

// add data transforms
c2BackgroundCanvas.addTransform(transforms.c2BackgroundTransform);
c2BackgroundCanvas.addTransform(transforms.c2AnimalTransform);

// animal layer
var c2AnimalLayer = new Layer("c2animal", false);
c2BackgroundCanvas.addLayer(c2AnimalLayer);
c2AnimalLayer.addPlacement(placements.c2AnimalPlacement);
c2AnimalLayer.addRenderingFunc(renderers.animalCircleRendering);

// bg layer
var c2BackgroundLayer = new Layer("c2background", false);
c2BackgroundCanvas.addLayer(c2BackgroundLayer);
c2BackgroundLayer.addPlacement(placements.c2BackgroundPlacement);
c2BackgroundLayer.addRenderingFunc(renderers.backgroundRendering);

// ================== Canvas 3 ===================
var c3BackgroundCanvas = new Canvas("c3Background", 81536, 31232);
p.addCanvas(c3BackgroundCanvas);

// add data transforms
c3BackgroundCanvas.addTransform(transforms.c3BackgroundTransform);
c3BackgroundCanvas.addTransform(transforms.c3AnimalTransform);

// animal layer
var c3AnimalLayer = new Layer("c3animal", false);
c3BackgroundCanvas.addLayer(c3AnimalLayer);
c3AnimalLayer.addPlacement(placements.c3BackgroundPlacement);
c3AnimalLayer.addRenderingFunc(renderers.animalIconRendering);

// bg layer
var c3BackgroundLayer = new Layer("c3background", false);
c3BackgroundCanvas.addLayer(c3BackgroundLayer);
c3BackgroundLayer.addPlacement(placements.c3BackgroundPlacement);
c3BackgroundLayer.addRenderingFunc(renderers.backgroundRendering);

// ================== Canvas 1 <-> Canvas 2 ===================

p.addJump(new Jump("c1Background", "c2Background", 0, "", "", "literal_zoom_in"));
p.addJump(new Jump("c2Background", "c1Background", 0, "", "", "literal_zoom_out"));

// ================== Canvas 2 <-> Canvas 3 ===================

p.addJump(new Jump("c2Background", "c3Background", 0, "", "", "literal_zoom_in"));
p.addJump(new Jump("c3Background", "c2Background", 0, "", "", "literal_zoom_out"));

// initialize canvas
p.initialCanvas("c1Background", 0, 0, ["", ""]);

// save to db
p.saveProject();
