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
var p = new Project("namebubble", "../../../config.txt", 1000, 1000);

// ================== Canvas 1 ===================
var c1 = new Canvas("fullname", 5000, 5000);
p.addCanvas(c1);

// add axes
c1.addAxes(renderers.c1c2Axes);

// static trim layer
var c1L0 = new Layer(null, true);
c1.addLayer(c1L0);
c1L0.addRenderingFunc(renderers.c1StaticTrim);

// circle layer pi
var c1L1 = new Layer(transforms.c1ScalexyPi);
c1.addLayer(c1L1);
c1L1.addPlacement(placements.c1L1Placement);
c1L1.addRenderingFunc(renderers.c1L1Rendering);

// rectangle layer student
var c1L2 = new Layer(transforms.c1ScalexyStu);
c1.addLayer(c1L2);
c1L2.addPlacement(placements.c1L1Placement);
c1L2.addRenderingFunc(renderers.c1L2Rendering);

// background layer
var c1L3 = new Layer(null, true);
c1.addLayer(c1L3);
c1L3.addRenderingFunc(renderers.c1L3Rendering);


// ================== Canvas 2 ===================
var c2 = new Canvas("firstname", 1000, 1000);
p.addCanvas(c2);

// add axes
c2.addAxes(renderers.c1c2Axes);

// ******** Canvas2 only layer ********
var c2L1 = new Layer(transforms.c2IDTransform, true);
c2.addLayer(c2L1);
c2L1.addRenderingFunc(renderers.c2L1Rendering);


// ================== Canvas 3 ===================
var c3 = new Canvas("lastname", 1000, 1000);
p.addCanvas(c3);

// ******** canvas3 name layer ********
var c3L1 = new Layer(transforms.c3IDTransform, true);
c3.addLayer(c3L1);
c3L1.addRenderingFunc(renderers.c3L1Rendering);

// ******** canvas3 text layer
var c3L2 = new Layer(null, true);
c3.addLayer(c3L2);
c3L2.addRenderingFunc(renderers.c3StaticTrim);

// initialize canvas
p.setInitialStates(c1, 500, 500, ["", "", "", ""]);



// ================== fullname --> firstname, lastname ===================
var firstNameSelector = function (row, layerId) {
    return (layerId == 1);
};

var lastNameSelector = function (row, layerId) {
    return (layerId == 2);
};

var newViewport1 = function (row) {
    return [1, ["id=\'" + row[0] + "\'"]];
};

var newPredicate1 = function (row) {
    return ["id=\'" + row[0] + "\'"];
};

var newViewport2 = function (row) {
    return [1, ["id=\'" + row[0] + "\'", ""]];
};

var newPredicate2 = function (row) {
    return ["id=\'" + row[0] + "\'", ""]
};

p.addJump(new Jump(c1, c2, firstNameSelector, newViewport1, newPredicate1, "semantic_zoom"));
p.addJump(new Jump(c1, c3, lastNameSelector, newViewport2, newPredicate2, "semantic_zoom"));

p.saveProject();
