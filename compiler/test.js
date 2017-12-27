const Project = require("./src/index").Project;

p1 = new Project("helloworld", "dbconfig.txt");

var placement = function () {};
var transform = function () {};
var rendering = function () {};
var separable = false;
var query = "SELECT * from table;";

for (var i = 0; i < 10; i ++)
    p1.addCanvas("c" + i.toString(), query, placement, transform, rendering, separable);

p1.layerCanvases(["c1", "c2", "c3"]);
p1.layerCanvases(["c5", "c0", "c9"]);
p1.layerCanvases(["c6", "c4"]);
console.log(p1);
