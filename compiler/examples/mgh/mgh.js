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
var p = new Project("mgh", "../../../config.txt", 1200, 1600);
p.addRenderingParams(renderers.renderingParams);

// ================== EEG canvas ===================
var maxSegNum = 3000;
var pixelPerSeg = 200;
var layerHeight = 80;
var numChannel = 20;
var eegCanvas = new Canvas("eeg", maxSegNum * pixelPerSeg, layerHeight * numChannel);
p.addCanvas(eegCanvas);

// label layer
var labelLayer = new Layer(transforms.dummyEEGTransform, true);
eegCanvas.addLayer(labelLayer);
labelLayer.addRenderingFunc(renderers.eegLabelRendering);

// eeg layer
var eegLayer = new Layer(transforms.dummyEEGTransform, false);
eegCanvas.addLayer(eegLayer);
eegLayer.addRenderingFunc(renderers.eegRendering);
eegLayer.addPlacement(placements.dummyEEGPlacement);

// setting up initial states
// abn999_20140711_151337
p.setInitialStates(eegCanvas, 200000, 0, ["", "sid1016_20170416_111752"]);

// save to db
p.saveProject();
