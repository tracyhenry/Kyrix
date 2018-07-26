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
var p = new Project("usmap", "../../../config.txt", 2000, 1000);
p.addRenderingParams(renderers.renderingParams);

// ================== state map canvas ===================
var stateMapCanvas = new Canvas("statemap", 2000, 1000);
p.addCanvas(stateMapCanvas);

// add data transforms
stateMapCanvas.addTransform(transforms.emptyTransform);
stateMapCanvas.addTransform(transforms.stateMapTransform);

// static legends layer
var stateMapLegendLayer = new Layer("empty", true);
stateMapCanvas.addLayer(stateMapLegendLayer);
stateMapLegendLayer.addRenderingFunc(renderers.stateMapLegendRendering);

// state boundary layer
var stateBoundaryLayer = new Layer("stateMapTrans", false);
stateMapCanvas.addLayer(stateBoundaryLayer);
stateBoundaryLayer.addPlacement(placements.stateMapPlacement);
stateBoundaryLayer.addRenderingFunc(renderers.stateMapRendering);

// ================== county map canvas ===================
var countyMapCanvas = new Canvas("countymap", 2000 * 5, 1000 * 5);
p.addCanvas(countyMapCanvas);

// add data transforms
countyMapCanvas.addTransform(transforms.emptyTransform);
countyMapCanvas.addTransform(transforms.countyMapTransform);
countyMapCanvas.addTransform(transforms.countyMapStateBoundaryTransform);

// static legends layer
var countyMapLegendLayer = new Layer("empty", true);
countyMapCanvas.addLayer(countyMapLegendLayer);
countyMapLegendLayer.addRenderingFunc(renderers.countyMapLegendRendering);

// thick state boundary layer
var countyMapStateBoundaryLayer = new Layer("countyMapStateTrans", false);
countyMapCanvas.addLayer(countyMapStateBoundaryLayer);
countyMapStateBoundaryLayer.addPlacement(placements.countyMapPlacement);
countyMapStateBoundaryLayer.addRenderingFunc(renderers.countyMapStateBoundaryRendering);

// county boundary layer
var countyBoundaryLayer = new Layer("countyMapTrans", false);
countyMapCanvas.addLayer(countyBoundaryLayer);
countyBoundaryLayer.addPlacement(placements.countyMapPlacement);
countyBoundaryLayer.addRenderingFunc(renderers.countyMapRendering);

// ================== state -> county ===================
var selector = function (row, layerId) {
    return (layerId == 1);
};

var newPredicates = function () {
    return ["", "", ""];
};

var newViewport = function (row) {
    return [0, row[1] * 5 - 1000, row[2] * 5 - 500];
};

var jumpName = function (row) {
    return "County map of " + row[3];
};

p.addJump(new Jump("statemap", "countymap", selector, newViewport, newPredicates, "geometric_semantic_zoom", jumpName));

// initialize canvas
p.initialCanvas("statemap", 0, 0, ["", ""]);

// save to db
p.saveProject();
