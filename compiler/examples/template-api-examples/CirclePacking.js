// libraries
const Project = require("../../src/index").Project;
const Canvas = require("../../src/Canvas").Canvas;
const Jump = require("../../src/Jump").Jump;
const Layer = require("../../src/Layer").Layer;
const View = require("../../src/View").View;
const CirclePacking = require("../../src/template-api/CirclePacking")
    .CirclePacking;

var p = new Project("circlepacking", "../../../config.txt");

// https://raw.githubusercontent.com/d3/d3-hierarchy/master/test/data/flare.json
// already loaded in docker
var data = "./flare.json";
var value = "value";
var id = "name";
var children = "children";

var args = {
    // required arguments
    data: data,
    value: value,
    children: children,
    id: id

    // optional arguments
    // zoomFactor: 2
};

var pack = new CirclePacking(args);
p.addCirclePacking(pack);

p.saveProject();
