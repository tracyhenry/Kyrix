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

// logo layer
var flarePackLayer = new Layer(transforms.flareTransform, true);
flareCanvas.addLayer(flarePackLayer);
flarePackLayer.addRenderingFunc(renderers.flarePackRendering);

// ================== self jump ===================
var selector = function () {
    return true;
};

var newViewport = function () {
    return {"constant" : [0, 0]};
};

var newPredicate = function (row) {
    var pred = {"OR" : [
            {"==" : ["id", row.id]},
            {"==" : ["parent_id", row.id]}
        ]};
    return {"layer0" : pred};
};

var jumpName = function (row) {
    return "Zoom into " + row.name;
};

p.addJump(new Jump(flareCanvas, flareCanvas, "semantic_zoom", {selector : selector,
    viewport : newViewport, predicates : newPredicate, name : jumpName}));

// initialize canvas
p.setInitialStates(flareCanvas, 0, 0, {"layer0" : {
        "OR" : [
            {"==" : ["id", "1"]},
            {"==" : ["parent_id", "1"]}
        ]
    }});

// save to db
p.saveProject();
