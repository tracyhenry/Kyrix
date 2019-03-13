// libraries
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
var p = new Project("genomic", "../../../config.txt", 1000, 500);

// ================== Canvas phenotype =============
var nameCanvas = new Canvas("name",6000, 1500);
p.addCanvas(nameCanvas);

var nameLayer = new Layer(transforms.phenotypeTransform, false);
nameCanvas.addLayer(nameLayer);
nameLayer.addPlacement(placements.namePlacement);
nameLayer.addRenderingFunc(renderers.nameRendering);


// ================== Canvas dots ===================
var dotsCanvas = new Canvas("dots", 10000, 500);
p.addCanvas(dotsCanvas);

// dots layer
var dotsLayer = new Layer(transforms.idTransform, false);
dotsCanvas.addLayer(dotsLayer);
dotsLayer.addPlacement(placements.dotsPlacement);
dotsLayer.addRenderingFunc(renderers.dotsRendering);

// y axis layer
dotsCanvas.addAxes(renderers.axes);
// ================== Canvas type =================
var typeCanvas = new Canvas("type", 10000, 500);
p.addCanvas(typeCanvas);

var typeLayer = new Layer(transforms.emptyTransform, false);
typeCanvas.addLayer(typeLayer);
typeLayer.addPlacement(placements.typePlacement);
typeLayer.addRenderingFunc(renderers.typeRendering);

//y axis layer
typeCanvas.addAxes(renderers.axes);
// ================== name -> value ==================
var selector = function (row, args) {
    return (args.layerId == 0);
};

var newViewport = function () {
    return {"constant" : [0, 0]};
};

var newPredicate = function (row) {
    return {"layer0" : {"==" : ["name", row.id]}};
};

var jumpName = function (row) {
    return "see more";
};

p.addJump(new Jump(nameCanvas, dotsCanvas,  "semantic_zoom", {selector : selector,
    viewport : newViewport, predicates : newPredicate, name : jumpName}));
// ================== Views ==========================
var view = new View("nameview", 0, 0, 1000, 500);
p.addView(view);
p.setInitialStates(view, nameCanvas, 0, 0);

// ================== value -> type ==================
var newTypePredicate = function (row) {
    return {"layer0" : {"==" : ["name", row.x]}};
};

p.addJump(new Jump(dotsCanvas, typeCanvas, "semantic_zoom", {selector : selector,
    viewport : newViewport, predicates : newTypePredicate, name : jumpName}));
// initialize canvas

// save to db
p.saveProject();