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

// ================== cluster canvas ===============
var topLevelWidth = 1200;
var topLevelHeight = 1600;
var canvases = [];
// cluster parameters
const numLevels = transforms.numLevels;
const zoomFactor = transforms.zoomFactor;

for (var i = 0; i < numLevels; i ++) {
    var width = topLevelWidth * Math.pow(zoomFactor, i);
    var height = topLevelHeight * Math.pow(zoomFactor, i);

    // construct a new canvas
    var curCanvas = new Canvas("clusterlevel" + i, width, height);
    canvases.push(curCanvas);
    p.addCanvas(curCanvas);

    // create one layer
    var curLayer = new Layer(transforms.scales[i]. false);
    curCanvas.addLayer(curLayer);
    curLayer.addPlacement(placements.clusterPlacement);
    curLayer.addRenderingFunc(renderers.clusterRendering);
}

for (var i = 0; i + 1 < numLevels; i ++) {
    p.addJump(new Jump(canvases[i], canvases[i + 1], "", "", "", "literal_zoom_in"));
    p.addJump(new Jump(canvases[i + 1], canvases[i], "", "", "", "literal_zoom_out"));
}

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


// ================== jump from cluster to eeg ================
var selector = function (row, layerId) {
    return (layerId == 0);
};

var newViewport = function (row) {
    var tostring = row[0].split("_");
    xStart = Math.max(0, (+tostring[3] - 2)) * pixelPerSeg;
    return [0, xStart, 0];
};

var newPredicate = function (row) {
    var tostring = row[0].split("_");
    return ["", tostring[0]+"_"+tostring[1]+"_"+tostring[2]];
};

var jumpName = function (row) {
    return "Jump to " + row[0];
};

p.addJump(new Jump(clusterlevel6, eeg, selector, newViewport, newPredicate, "semantic_zoom", jumpName));

// setting up initial states
// abn999_20140711_151337
//p.setInitialStates(eegCanvas, 200000, 0, ["", "sid1016_20170416_111752"]);
p.setInitialStates(canvases[0], 200, 200, [""]);

// save to db
p.saveProject();
