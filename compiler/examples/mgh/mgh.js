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
var viewportWidth = 2000;
var viewportHeight = 1600;
var p = new Project("mgh", "../../../config.txt", viewportWidth, viewportHeight);
p.addRenderingParams(renderers.renderingParams);

// ================== cluster canvases ===============
var width = 800;
var height = 1000;
var clusterCanvases = [];

// cluster parameters
var numLevels = transforms.numLevels;
var zoomFactor;

for (var i = 0; i < numLevels; i ++) {

    // construct a new canvas
    var curCanvas = new Canvas("clusterlevel" + i, width, height);
    clusterCanvases.push(curCanvas);
    p.addCanvas(curCanvas);

    // create one layer
    var curLayer = new Layer(transforms.scales[i], false);
    curCanvas.addLayer(curLayer);
    curLayer.addPlacement(placements.clusterPlacement);
    curLayer.addRenderingFunc(renderers.clusterRendering);

    // add axis
    curCanvas.addAxes(renderers.clusterAxes);

    // calculate width & height for the next level
    if (i <= 1)
        zoomFactor = 8;
    else
        zoomFactor = 3;
    var width = width * zoomFactor;
    var height = height * zoomFactor;
}

// ================== EEG canvas ===================
var maxSegNum = 43200;
var pixelPerSeg = 250;
var layerHeight = 85;
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

// x axis
eegCanvas.addAxes(renderers.eegXAxes);

// ================== Spectrogram canvas (15-min images) ===================
var spectrogramWidth = 86400 / 15 / 60 * 450;
var spectrogramHeight = 600; // spectrogram viewport width is 800 in coordinated views
var spectrogramCanvas = new Canvas("spectrogram", spectrogramWidth, spectrogramHeight);
p.addCanvas(spectrogramCanvas);

var freqLayer = new Layer(transforms.dummySpectrogramTransform, false);
spectrogramCanvas.addLayer(freqLayer);
freqLayer.addRenderingFunc(renderers.spectrogramRendering);
freqLayer.addPlacement(placements.dummySpectrogramPlacement);


// ================== jumps between cluster canvases ================
for (var i = 0; i + 1 < numLevels; i ++) {
    p.addJump(new Jump(clusterCanvases[i], clusterCanvases[i + 1], "", "", "", "literal_zoom_in"));
    p.addJump(new Jump(clusterCanvases[i + 1], clusterCanvases[i], "", "", "", "literal_zoom_out"));
}

// ================== jump from cluster to eeg ================
var selector = function () {
    return true;
};

var newEEGViewport = function (row) {
    var tokens = row[0].split("_");
    xStart = Math.max(tokens[3] * 250 + 125 - 2000 / 2, 0);
    return [0, xStart, 0];
};

var newEEGPredicate = function (row) {
    var tokens = row[0].split("_");
    return ["", tokens[0] + "_" + tokens[1] + "_" + tokens[2]];
};

for (var i = 0; i < numLevels; i ++)
    p.addJump(new Jump(clusterCanvases[i], eegCanvas, selector, newEEGViewport, newEEGPredicate, "semantic_zoom"));

// ================== jump from cluster to spectrogram ================
var newSpectrogramViewport = function (row) {
    var tokens = row[0].split("_");
    xStart = Math.max(tokens[3] - 800 / 2, 0); // spectrogram viewport width is 800 in coordinated views
    return [0, xStart, 0];
};

var newSpectrogramPredicate = function (row) {
    var tokens = row[0].split("_");
    return [tokens[0] + "_" + tokens[1] + "_" + tokens[2]];
};

for (var i = 0; i < numLevels; i ++)
    p.addJump(new Jump(clusterCanvases[i], spectrogramCanvas, selector, newSpectrogramViewport, newSpectrogramPredicate, "semantic_zoom"));

// setting up initial states
// abn999_20140711_151337
//p.setInitialStates(eegCanvas, 0, 0, ["", "sid54_20150529_112817"]);
p.setInitialStates(clusterCanvases[numLevels - 1], 0, 0, [""]);

// save to db
p.saveProject();
