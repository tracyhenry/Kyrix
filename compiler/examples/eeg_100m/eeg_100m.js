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
var viewportWidth = 800;
var viewportHeight = 1600;
var p = new Project("eeg100m", "../../../config.txt", viewportWidth, viewportHeight);

// ================== EEG Top canvas ===================
var maxSegNum = 43200;
var pixelPerSeg = 200;
var layerHeight = 80;
var numChannel = 20;
var topCanvas = new Canvas("top", maxSegNum * pixelPerSeg, layerHeight * numChannel);
p.addCanvas(topCanvas);

// label layer
var labelLayer = new Layer(transforms.emptyTransform, true);
labelLayer.addRenderingFunc(renderers.eegLabelRendering);
topCanvas.addLayer(labelLayer);

// eeg layer
var eegLayer = new Layer(transforms.eegTransform, false);
eegLayer.addRenderingFunc(renderers.eegRendering);
eegLayer.addPlacement(placements.eegPlacement);
topCanvas.addLayer(eegLayer);

// x axis
topCanvas.addAxes(renderers.eegXAxes);

// ================== EEG bottom canvas ===================
var pixelPerSeg = 400;
var bottomCanvas = new Canvas("bottom", maxSegNum * pixelPerSeg, layerHeight * numChannel);
p.addCanvas(bottomCanvas);

// label layer
bottomCanvas.addLayer(labelLayer);
bottomCanvas.addLayer(eegLayer);

// x axis
bottomCanvas.addAxes(renderers.eegXAxes);

// ================== top->bottom ===================
p.addJump(new Jump(topCanvas, bottomCanvas, "", "", "", "literal_zoom_in"));
p.addJump(new Jump(bottomCanvas, topCanvas, "", "", "", "literal_zoom_out"));

// setting up initial states
p.setInitialStates(topCanvas, 10000, 0, ["", ""]);

// save to db
p.saveProject();
