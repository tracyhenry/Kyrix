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
var viewportWidth = 1200;
var viewportHeight = 1600;
var p = new Project("mgh", "../../../config.txt", viewportWidth, viewportHeight);
p.addRenderingParams(renderers.renderingParams);

// ================== cluster canvases ===============
var topLevelWidth = viewportWidth;
var topLevelHeight = viewportHeight;
var clusterCanvases = [];

// cluster parameters
const numLevels = transforms.numLevels;
const zoomFactor = transforms.zoomFactor;

for (var i = 0; i < numLevels; i ++) {
    var width = topLevelWidth * Math.pow(zoomFactor, i);
    var height = topLevelHeight * Math.pow(zoomFactor, i);

    // construct a new canvas
    var curCanvas = new Canvas("clusterlevel" + i, width, height);
    clusterCanvases.push(curCanvas);
    p.addCanvas(curCanvas);

    // create one layer
    var curLayer = new Layer(transforms.scales[i], false);
    curCanvas.addLayer(curLayer);
    curLayer.addPlacement(placements.clusterPlacement);
    curLayer.addRenderingFunc(renderers.clusterRendering);
}

for (var i = 0; i + 1 < numLevels; i ++) {
    p.addJump(new Jump(clusterCanvases[i], clusterCanvases[i + 1], "", "", "", "literal_zoom_in"));
    p.addJump(new Jump(clusterCanvases[i + 1], clusterCanvases[i], "", "", "", "literal_zoom_out"));
}

// ================== EEG canvas ===================
var maxSegNum = 43200;
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

// x axis
eegCanvas.addAxes(renderers.eegXAxes);

// ================== Spectrum canvas ===================
var spectrumWidth = 30000;
var spectrumHeight = viewportHeight;
var spectrumCanvas = new Canvas("spectrum", spectrumWidth, spectrumHeight);
p.addCanvas(spectrumCanvas);

/*
// label layer
var freqlabelLayer = new Layer(transforms.dummySpectrumTransform, true);
spectrumCanvas.addLayer(freqlabelLayer);
freqlabelLayer.addRenderingFunc(renderers.spectrumLabelRendering);
*/

var freqLayer = new Layer(transforms.dummySpectrumTransform, false);
spectrumCanvas.addLayer(freqLayer);
freqLayer.addRenderingFunc(renderers.spectrumRendering);
freqLayer.addPlacement(placements.spectrumPlacement);

// ================== jump from cluster to eeg ================
var selector = function () {
    return true;
};

var newEEGViewport = function (row) {
    var tokens = row[0].split("_");
    xStart = Math.max(tokens[3] * 200 + 100 - 1200 / 2, 0);
    return [0, xStart, 0];
};

var newEEGPredicate = function (row) {
    var tokens = row[0].split("_");
    return ["", tokens[0] + "_" + tokens[1] + "_" + tokens[2]];
};

var jumpNameEEG = function (row) {
    return "Jump to eeg segment: " + row[0];
};

p.addJump(new Jump(clusterCanvases[numLevels - 1], eegCanvas, selector, newEEGViewport, newEEGPredicate, "semantic_zoom", jumpNameEEG));

// ================== jump from cluster to spectrum ================

var newSpectrumViewport = function (row) {
    var tokens = row[0].split("_");
    xStart = Math.max(tokens[3] - 1600 / 2, 0);
    return [0, xStart, 0];
};

var newSpectrumPredicate = function (row) {
    return [row[0]];
};

var jumpNameSpectrum = function (row) {
    return "Jump to spectrum segment: " + row[0];
};

p.addJump(new Jump(clusterCanvases[numLevels - 1], spectrumCanvas, selector, newSpectrumViewport, newSpectrumPredicate, "semantic_zoom", jumpNameSpectrum));

// setting up initial states
// abn999_20140711_151337
//p.setInitialStates(eegCanvas, 0, 0, ["", "sid54_20150529_112817"]);
p.setInitialStates(clusterCanvases[numLevels - 1], 0, 0, [""]);

// save to db
p.saveProject();
