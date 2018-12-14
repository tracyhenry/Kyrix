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
var viewportWidth = 1600;
var viewportHeight = 1600;
var p = new Project("eeglarge", "../../../config.txt", viewportWidth, viewportHeight);

// ================== EEG Top canvas ===================
var maxSegNum = 43200;
var pixelPerSeg = 200;
var layerHeight = 80;
var numChannel = 20;
var eegCanvas = new Canvas("eeg", maxSegNum * pixelPerSeg, layerHeight * numChannel);
p.addCanvas(eegCanvas);

// label layer
var labelLayer = new Layer(transforms.emptyTransform, true);
labelLayer.addRenderingFunc(renderers.eegLabelRendering);
eegCanvas.addLayer(labelLayer);

// eeg layer
var eegLayer = new Layer(transforms.eegTransform, false);
eegLayer.addRenderingFunc(renderers.eegRendering);
eegLayer.addPlacement(placements.eegTopPlacement);
eegCanvas.addLayer(eegLayer);

// x axis
eegCanvas.addAxes(renderers.eegXAxes);

// setting up initial states
p.setInitialStates(eegCanvas, 1000, 0, ["", ""]);

// save to db
p.saveProject();
