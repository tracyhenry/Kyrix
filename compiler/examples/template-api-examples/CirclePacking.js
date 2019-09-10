// libraries
const Project = require("../../src/index").Project;
const Canvas = require("../../src/Canvas").Canvas;
const Jump = require("../../src/Jump").Jump;
const Layer = require("../../src/Layer").Layer;
const View = require("../../src/View").View;
const CirclePacking = require("../../src/template-api/CirclePacking")
    .CirclePacking;

var p = new Project("epl", "../../../config.txt");

var data = "./flare.json";
var value = "value";
var id = "name";
var children = "children";

var args = {
    // need
    data: data,
    value: value,
    children: children,
    id: id,

    zoomFactor: 2
};

var pack = new CirclePacking(args);
p.addCirclePacking(pack);

p.saveProject();
