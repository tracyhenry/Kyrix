// libraries
const Project = require("../../src/index").Project;
const Canvas = require("../../src/Canvas").Canvas;
const Jump = require("../../src/Jump").Jump;
const Layer = require("../../src/Layer").Layer;
const View = require("../../src/View").View;

// project components
const renderers = require("../USMap/renderers");
const transforms = require("../USMap/transforms");
const placements = require("../USMap/placements");

// construct a project
var p = new Project("usmap_cmv", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);

// ================== state map canvas ===================
var stateMapCanvas = new Canvas("statemap", 2000, 1000);
p.addCanvas(stateMapCanvas);

// static legends layer
var stateMapLegendLayer = new Layer(null, true);
stateMapCanvas.addLayer(stateMapLegendLayer);
stateMapLegendLayer.addRenderingFunc(renderers.stateMapLegendRendering);

// state boundary layer
var stateBoundaryLayer = new Layer(transforms.stateMapTransform, false);
stateMapCanvas.addLayer(stateBoundaryLayer);
stateBoundaryLayer.addPlacement(placements.stateMapPlacement);
stateBoundaryLayer.addRenderingFunc(renderers.stateMapRendering);

// ================== county map canvas ===================
var countyMapCanvas = new Canvas("countymap", 2000 * 5, 1000 * 5);
p.addCanvas(countyMapCanvas);

// static legends layer
var countyMapLegendLayer = new Layer(null, true);
countyMapCanvas.addLayer(countyMapLegendLayer);
countyMapLegendLayer.addRenderingFunc(renderers.countyMapLegendRendering);

// thick state boundary layer
var countyMapStateBoundaryLayer = new Layer(
    transforms.countyMapStateBoundaryTransform,
    false
);
countyMapCanvas.addLayer(countyMapStateBoundaryLayer);
countyMapStateBoundaryLayer.addPlacement(placements.countyMapPlacement);
countyMapStateBoundaryLayer.addRenderingFunc(
    renderers.countyMapStateBoundaryRendering
);

// county boundary layer
var countyBoundaryLayer = new Layer(transforms.countyMapTransform, false);
countyMapCanvas.addLayer(countyBoundaryLayer);
countyBoundaryLayer.addPlacement(placements.countyMapPlacement);
countyBoundaryLayer.addRenderingFunc(renderers.countyMapRendering);

// ================== Views ===================
var view = new View("state", 0, 0, 2000, 1000);
p.addView(view);
p.setInitialStates(view, stateMapCanvas, 0, 0);

var rightView = new View("county", 2100, 0, 2000, 1000);
p.addView(rightView);

// ================== state -> county ===================
var selector = function(row, args) {
    return args.layerId == 1;
};

var newPredicates = function() {
    return {};
};

var newViewport = function(row) {
    return {constant: [row.bbox_x * 5 - 1000, row.bbox_y * 5 - 500]};
};

var jumpName = function(row) {
    return "County map of " + row.name;
};

p.addJump(
    new Jump(stateMapCanvas, countyMapCanvas, "load", {
        selector: selector,
        viewport: newViewport,
        predicates: newPredicates,
        name: jumpName,
        sourceView: view,
        destView: rightView
    })
);

// save to db
p.saveProject();
