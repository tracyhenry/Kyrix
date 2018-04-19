const index = require("./src/index");
const Project = index.Project;
const Canvas = index.Canvas;
const Layer = index.Layer;
const Jump = index.Jump;
const Transform = index.Transform;
const d3 = require("d3");


// construct a project
var p = new Project("demo", "dbconfig.txt", 1000, 1000);

var c1 = new Canvas("fullname", 5000, 5000);
p.addCanvas(c1);

// ******** Define Data transforms for Canvas 1 ********
// scale x and y from the pi table
var c1ScalexyPi = new Transform("scalexy_pi",
    "select * from pi;",
    "wenbo",
    function (row) {
        row[3] = d3.scaleLinear().domain([0, 5000000]).range([0, 5000])(row[3]);
        row[4] = d3.scaleLinear().domain([0, 5000000]).range([0, 5000])(row[4]);
        return row;
    },
    ["id", "firstname", "lastname", "x", "y"],
    true
);
c1.addTransform(c1ScalexyPi);

// scale x and y from the stu table;
var c1ScalexyStu = new Transform("scalexy_stu",
    "select * from stu;",
    "wenbo",
    function (row) {
        row[3] = d3.scaleLinear().domain([0, 5000000]).range([0, 5000])(row[3]);
        row[4] = d3.scaleLinear().domain([0, 5000000]).range([0, 5000])(row[4]);
        return row;
    },
    ["id", "firstname", "lastname", "x", "y"],
    true
);
c1.addTransform(c1ScalexyStu);

// empty transform
var c1Empty = new Transform("empty",
    "",
    "",
    function (row) {}, [], true);
c1.addTransform(c1Empty);


// ******** Circle Layer (pi table) ********
var c1L1 = new Layer("scalexy_pi");
c1.addLayer(c1L1);

// placement object
var c1L1Placement = {};
c1L1Placement.centroid_x = "col:x";
c1L1Placement.centroid_y = "col:y";
c1L1Placement.width = "con:161";
c1L1Placement.height = "con:161";
c1L1.addPlacement(c1L1Placement);

// rendering function
var c1L1Rendering = function render(svg, data) {
    g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {return d[3];})
        .attr("cy", function(d) {return d[4];})
        .attr("r", 80)
        .style("fill", "orange")
        .attr("data-tuple", function(d) {return d;});
    g.selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {return d[1] + " " + d[2];})
        .attr("x", function(d) {return d[3];})
        .attr("y", function(d) {return d[4];})
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1)
        .attr("data-tuple", function(d) {return d;});
};
c1L1.addRenderingFunc(c1L1Rendering);



// ******** Background layer (no table) ********
var c1L3 = new Layer("empty");
c1.addLayer(c1L3);

// dummy placement object
c1L3Placement = {};
c1L3Placement.centroid_x = "con:0";
c1L3Placement.centroid_y = "con:0";
c1L3Placement.width = "con:0";
c1L3Placement.height = "con:0";
c1L3.addPlacement(c1L3Placement);

// rendering function, an empty g with a background color fill
var c1L3Rendering = function render(svg, data) {
    g = svg.append("g")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 5000)
        .attr("height", 5000)
        .style("fill", "beige");
};
c1L3.addRenderingFunc(c1L3Rendering);


p.initialCanvas("fullname", 500, 500, ["", ""]);

p.saveToDb();
