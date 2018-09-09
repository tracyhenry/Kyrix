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


// ================== Full name canvas ===================
var width = 5000, height = 5000;
var fullNameCanvas = new Canvas("fullname", width, height);
p.addCanvas(fullNameCanvas);

// add data transforms
fullNameCanvas.addTransform(transforms.fullNameCircleTransform);
fullNameCanvas.addTransform(transforms.fullNameRectangleTransform);
fullNameCanvas.addTransform(transforms.emptyTransform);

// kyrix text (layerId = 0)
var fullNameStaticLayer = new Layer("empty", true);
fullNameCanvas.addLayer(fullNameStaticLayer);
fullNameStaticLayer.addRenderingFunc(renderers.fullNameStaticRendering);

// circle layer pi (layerId = 1)
var fullNameCircleLayer = new Layer("scalexy_pi", false);
fullNameCanvas.addLayer(fullNameCircleLayer);
fullNameCircleLayer.addPlacement(placements.fullNamePlacement);
fullNameCircleLayer.addRenderingFunc(renderers.fullNameCircleRendering);

// rectangle layer student (layerId = 2)
var fullNameRectangleLayer = new Layer("scalexy_stu", false);
fullNameCanvas.addLayer(fullNameRectangleLayer);
fullNameRectangleLayer.addPlacement(placements.fullNamePlacement);
fullNameRectangleLayer.addRenderingFunc(renderers.fullNameRectangleRendering);

// background layer (layerId = 3)
var fullNameBkgLayer = new Layer("empty", true);
fullNameCanvas.addLayer(fullNameBkgLayer);
fullNameBkgLayer.addRenderingFunc(renderers.fullNameBkgRendering);




//******** complete the definition of the first name canvas






// last name canvas

var width = 1000, height = 1000;
var lastNameCanvas = new Canvas("lastname", width, height);
p.addCanvas(lastNameCanvas);

// add data transforms
lastNameCanvas.addTransform(transforms.lastNameTransform);

// kyrix text (layerId = 0)
var lastnameLayer = new Layer("identical", true);
lastNameCanvas.addLayer(lastnameLayer);
lastnameLayer.addRenderingFunc(renderers.lastNameRendering);


// initialize canvas
p.initialCanvas("fullname", 500, 500, ["", "", "", ""]);



// ================== fullname --> firstname, lastname ===================
var firstNameSelector = function (row, layerId) {
    // all geometries in layer 1 can trigger this zoom
    return (layerId == 1);
};

var lastNameSelector = function (row, layerId) {
    // all geometries in layer 2 can trigger this zoom
    return (layerId == 2);
};


var newViewport = function (row) {
    // the first 0 means new viewport is a constant
    // last two zeroes are the viewport coordinates
    // (top-lefthand corner) on the destination canvas
    return [0, 0, 0];
};

//
// filter out all others but the clicked name
//
var newPredicate = function (row) {
    // filter the transform result to only 1 pi
    return ["id=\'" + row[0] + "\'"];
};


//**** complete a jump from full name to firstname





// this is a jump from full name to last name
p.addJump(new Jump("fullname", "lastname", lastNameSelector, newViewport, newPredicate, "semantic_zoom"));

// saveProject() must be at the very end of this file
p.saveProject();
