const Project = require("./src/index").Project;

p1 = new Project("helloworld", "dbconfig.txt", 1024, 768);

var placement = function () {};
var transform = function () {};
var rendering = function () {};
var separable = false;
var query = "SELECT * from table;";

for (var i = 0; i < 10; i ++)
    p1.addCanvas("c" + i.toString(), 1024, 1024, query, placement, transform, rendering, separable);

p1.layerCanvases(["c1", "c2", "c3"]);
p1.layerCanvases(["c5", "c0", "c9"]);
p1.layerCanvases(["c6", "c4"]);
p1.initialCanvas("c0", 0, 0);

p1.addJump("c1", "c2", rendering, transform);
console.log(p1);
