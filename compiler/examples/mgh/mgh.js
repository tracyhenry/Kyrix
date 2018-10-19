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
var maxSegNum = 100000;
var pixelPerSeg = 400;
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


// ================== jump from cluster to eeg ================
var selector = function () {
    return true;
};

var newViewport = function (row) {
    var tokens = row[0].split("_");
    xStart = Math.max(tokens[3] * 400 + 200 - 1200 / 2, 0);
    return [0, xStart, 0];
};

var newPredicate = function (row) {
    var tokens = row[0].split("_");
    return ["", tokens[0] + "_" + tokens[1] + "_" + tokens[2]];
};

var jumpName = function (row) {
    return "Jump to segment: " + row[0];
};

p.addJump(new Jump(clusterCanvases[numLevels - 1], eegCanvas, selector, newViewport, newPredicate, "semantic_zoom", jumpName));

// setting up initial states
// abn999_20140711_151337
//p.setInitialStates(eegCanvas, 200000, 0, ["", "sid1016_20170416_111752"]);
p.setInitialStates(clusterCanvases[0], 0, 0, [""]);

// save to db
p.saveProject();
