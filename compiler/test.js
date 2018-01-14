const Project = require("./src/index").Project;
const d3 = require("d3");

p1 = new Project("demo", "dbconfig.txt", 1000, 900);

var placement = {};
placement.centroid_x = function (row) {
    return d3.scaleLinear().domain([0, 1000000]).range([0, 1023])(row[0]);
};

placement.centroid_y = function (row) {
    return d3.scaleLinear().domain([0, 1000000]).range([0, 1023])(row[0]);
};

placement.width = function (row) {return 50; };
placement.height = function (row) {return 50; };

placement.cx_col = "x";
placement.cy_col = "y";
placement.width_col = "";
placement.height_col = "";


var transform = function () {};
var rendering = function render(svg, data) {
    var xyscale = d3.scaleLinear().domain([0, 1000000]).range([0, 1023]);
    g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {return xyscale(d[1]);})
        .attr("cy", function(d) {return xyscale(d[2]);})
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
