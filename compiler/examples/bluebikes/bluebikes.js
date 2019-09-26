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
var p = new Project("bluebikes", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);

// ================== Overall Map Canvas ===================
var width = 1000, height = 1000;
var overallMapCanvas = new Canvas("overall_map", width, height);
p.addCanvas(overallMapCanvas);

// stations
var stationsLayer = new Layer(transforms.stationsTransform, false);
overallMapCanvas.addLayer(stationsLayer);
stationsLayer.addPlacement(placements.stationsPlacement);
stationsLayer.addRenderingFunc(renderers.stationsRendering);

// map layer
var overallMapLayer = new Layer(transforms.overallMapTransform, false);
overallMapCanvas.addLayer(overallMapLayer);
overallMapLayer.addPlacement(placements.mapPlacement);
overallMapLayer.addRenderingFunc(renderers.overallMapRendering);

//title layer
var titleLayer = new Layer(null, true);
overallMapCanvas.addLayer(titleLayer);
titleLayer.addRenderingFunc(renderers.titleRendering);

// ================== Inset Map Canvas ===================
var zoomFactor = renderers.renderingParams.insetMapScale / renderers.renderingParams.overallMapScale;
var insetMapCanvas = new Canvas("inset_map", parseInt(width*zoomFactor), parseInt(height*zoomFactor));
p.addCanvas(insetMapCanvas);

//station name layer
var stationNameLayer = new Layer(transforms.selectStationTransform, true);
insetMapCanvas.addLayer(stationNameLayer);
stationNameLayer.addRenderingFunc(renderers.stationNameRendering);

// rides in layer
var ridesInLayer = new Layer(transforms.ridesTransform, false);
insetMapCanvas.addLayer(ridesInLayer);
ridesInLayer.addPlacement(placements.ridesPlacement);
ridesInLayer.addRenderingFunc(renderers.ridesInRendering);

// rides out layer
var ridesOutLayer = new Layer(transforms.ridesTransform, false);
insetMapCanvas.addLayer(ridesOutLayer);
ridesOutLayer.addPlacement(placements.ridesPlacement);
ridesOutLayer.addRenderingFunc(renderers.ridesOutRendering);

// map layer
var insetMapLayer = new Layer(transforms.insetMapTransform, false);
insetMapCanvas.addLayer(insetMapLayer);
insetMapLayer.addPlacement(placements.mapPlacement);
insetMapLayer.addRenderingFunc(renderers.insetMapRendering);

/*
// ================== Table Canvas ===================
var width = 1750;
var height = 1000;

// construct a new canvas
var tableCanvas = new Canvas("table", width, height);
p.addCanvas(tableCanvas);

// // static pk column layer
// var boxscorePkColumnLayer = new Layer(transforms.boxscoreTransform, true);
// tableCanvas.addLayer(boxscorePkColumnLayer);
// boxscorePkColumnLayer.addRenderingFunc(renderers.boxscorePkRendering);

// pannable stats layer
var tableLayer = new Layer(transforms.tableTransform, false);
tableCanvas.addLayer(tableLayer);
tableLayer.addPlacement(placements.tablePlacement);
tableLayer.addRenderingFunc(renderers.tableRendering);
*/

// ================== Views ===================
var view = new View("bluebikes", 0, 0, width, height);
p.addView(view);
p.setInitialStates(view, overallMapCanvas, 0, 0);

// ================== overall_map -> inset_map ===================
var selector = function(row, args) {
    return args.layerId == 0;
};

var newViewport = function(row, args) {
    var zoomFactor = args.renderingParams.insetMapScale/args.renderingParams.overallMapScale;
    var vpW = args.viewportW;
    var vpH = args.viewportH;
    return {
        constant: [
            parseInt(row.bbox_x * zoomFactor) - vpW / 2,
            parseInt(row.bbox_y * zoomFactor) - vpH / 2
        ]
    };
};

var newPredicate = function(row) {
    // var pred0 = {"==": ["station", row.name]};
    var pred1 = {"==": ["end_station_name", row.name]};
    var pred2 = {"==": ["start_station_name", row.name]};
    return {layer1: pred1, layer2: pred2};
};

var jumpName = function(row) {
    return "Rides to & from " + row.name;
};

p.addJump(
    new Jump(overallMapCanvas, insetMapCanvas, "geometric_semantic_zoom", {
        selector: selector,
        viewport: newViewport,
        predicates: newPredicate,
        name: jumpName
    })
);

// ================== inset_map -> table ===================
/*var selector = function(row, args) {
    return args.layerId == 1 || args.layerId == 2;
};

var newViewport = function(row, args) {
    return {constant: [0, 0]};
};

var newPredicate = function(row) {
    var pred1 = {
        AND: [
            {"==": ["end_station_name", row.end_station_name]},
            {"==": ["start_station_name", row.start_station_name]}
        ]
    };
    var pred2 = {
        AND: [
            {"==": ["end_station_name", row.start_station_name]},
            {"==": ["start_station_name", row.end_station_name]}
        ]
    };
    return {layer1: pred1, layer2: pred2};
};

var jumpName = function(row) {
    return "Rides between " + row.start_station_name + " & " + row.end_station_name;
};

p.addJump(
    new Jump(insetMapCanvas, tableCanvas, "semantic_zoom", {
        selector: selector,
        viewport: newViewport,
        predicates: newPredicate,
        name: jumpName
    })
);*/

// save to db
p.saveProject();