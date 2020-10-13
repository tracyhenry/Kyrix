// libraries
const Project = require("../../src/index").Project;
const Canvas = require("../../src/Canvas").Canvas;
const Jump = require("../../src/Jump").Jump;
const Layer = require("../../src/Layer").Layer;
const View = require("../../src/View").View;

// project components
const renderers = require("./renderers");
const transforms = require("./transforms");
const placements = require("./placements");

// construct a project
var p = new Project("usmap", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);

// ================== state map canvas ===================
var stateMapWidth = 2000,
    stateMapHeight = 1000;
var stateMapCanvas = new Canvas("statemap", stateMapWidth, stateMapHeight);
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
var zoomFactor =
    renderers.renderingParams.countyMapScale /
    renderers.renderingParams.stateMapScale;
var countyMapCanvas = new Canvas(
    "countymap",
    stateMapWidth * zoomFactor,
    stateMapHeight * zoomFactor
);
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
countyBoundaryLayer.addTooltip(["name", "crimerate"], ["County", "Crime Rate"]);

// ================== Views ===================
var view = new View("usmap", 0, 0, stateMapWidth, stateMapHeight);
p.addView(view);
p.setInitialStates(view, stateMapCanvas, 0, 0);

// ================== state -> county ===================
var selector = function(row, args) {
    return args.layerId == 1;
};

var newPredicates = function() {
    return {};
};

var newViewport = function(row, args) {
    var zoomFactor =
        args.renderingParams.countyMapScale /
        args.renderingParams.stateMapScale;
    var vpW = args.viewportW;
    var vpH = args.viewportH;
    return {
        constant: [
            row.bbox_x * zoomFactor - vpW / 2,
            row.bbox_y * zoomFactor - vpH / 2
        ]
    };
};

var jumpName = function(row) {
    return "County map of " + row.name;
};

p.addJump(
    new Jump(stateMapCanvas, countyMapCanvas, "geometric_semantic_zoom", {
        selector: selector,
        viewport: newViewport,
        predicates: newPredicates,
        name: jumpName
    })
);

// save to db
p.saveProject();
