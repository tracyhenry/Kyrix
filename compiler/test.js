const Project = require("./src/index").Project;

p1 = new Project("demo", "dbconfig.txt", 1000, 900);

var placement = function () {};
var transform = function () {};
var rendering = function render(svg, data) {
    g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {return d[1];})
        .attr("cy", function(d) {return d[2];})
        .attr("r", 50)
        .style("fill", "orange");
};

var separable = false;
var query = "SELECT * from circle;";
var db = "wenbo";

for (var i = 0; i < 10; i ++)
    p1.addCanvas("c" + i.toString(), 1024, 1024, query, db, placement, transform, rendering, separable);

p1.layerCanvases(["c1", "c2", "c3"]);
p1.layerCanvases(["c5", "c0", "c9"]);
p1.layerCanvases(["c6", "c4"]);
p1.initialCanvas("c0", 0, 0);

p1.addJump("c1", "c2", rendering, transform);
p1.saveToDb();
