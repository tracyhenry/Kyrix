// libraries
const index = require("../../src/index");
const Project = index.Project;
const Canvas = index.Canvas;
const Layer = index.Layer;
const Jump = index.Jump;

// project components (placement is not needed in this example)
const renderers = require("./renderers");
const transforms = require("./transforms");

// construct a project
var p = new Project("flare", "../../../config.txt", 1000, 1000);
p.addRenderingParams(renderers.renderingParams);

// ================== the only canvas ===================
var flareCanvas = new Canvas("flare", 1000, 1000);
p.addCanvas(flareCanvas);

// add data transforms
flareCanvas.addTransform(transforms.flareTransform);

// logo layer
var flarePackLayer = new Layer("flareTrans", false);
flareCanvas.addLayer(flarePackLayer);
flarePackLayer.addRenderingFunc(renderers.flarePackRendering);

// ================== self jump ===================
var selector = function (row, layerId) {
    return (layerId == 0);
};

var newViewport = function (row) {
    return [0, 0, 0]
};

var newPredicate = function (row) {
    return ["(id=\'" + row[0] + "\' or " + "parent_id=\'" + row[0] + "\')"];
};

var jumpName = function (row) {
    return "Zoom into " + row[1];
};

p.addJump(new Jump("flare", "flare", selector, newViewport, newPredicate, "semantic_zoom", jumpName));

// initialize canvas
p.initialCanvas("flare", 0, 0, ["(id = \'1\' or parent_id = \'1\')"]);

// save to db
p.saveProject();
