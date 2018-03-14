const Project = require("./src/index").Project;
const d3 = require("d3");


// construct a project
p1 = new Project("demo", "dbconfig.txt", 1000, 1000);


// ================== Canvas 1 ===================

// specify the placement object of a canvas
var placement = {};
placement.centroid_x = function (row) {
    return d3.scaleLinear().domain([0, 5000000]).range([0, 5000])(row[0]);
};

placement.centroid_y = function (row) {
    return d3.scaleLinear().domain([0, 5000000]).range([0, 5000])(row[0]);
};
placement.width = function (row) {return 161; };
placement.height = function (row) {return 161; };
placement.cx_col = "x";
placement.cy_col = "y";
placement.width_col = "";
placement.height_col = "";


// rendering function
var transform = function () {};
var rendering = function render(svg, data) {
    var xyscale = d3.scaleLinear().domain([0, 5000000]).range([0, 5000]);
    g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {return xyscale(d[3]);})
        .attr("cy", function(d) {return xyscale(d[4]);})
        .attr("r", 80)
        .style("fill", "orange")
        .attr("data-tuple", function(d) {return d;});
    g.selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {return d[1] + " " + d[2];})
        .attr("x", function(d) {return xyscale(d[3]);})
        .attr("y", function(d) {return xyscale(d[4]);})
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1)
        .attr("data-tuple", function(d) {return d;});
};

var separable = false;
var query = "SELECT * from pi;";
var db = "wenbo";
p1.addCanvas("fullname", 5000, 5000, query, db, placement, transform, rendering, separable);



// ================== Canvas 2 ===================
placement = {};
placement.centroid_x = function (row) {return 500; };
placement.centroid_y = function (row) {return 500; };
placement.width = function (row) {return 200; };
placement.height = function (row) {return 200; };
placement.cx_col = "";
placement.cy_col = "";
placement.width_col = "";
placement.height_col = "";

rendering = function render(svg, data) {
    g = svg.append("g");
    g.selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {return d[1];})
        .attr("x", 500)
        .attr("y", 500)
        .attr("dy", ".35em")
        .attr("font-size", 50)
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1)
        .attr("data-tuple", function(d) {return d;});
};

p1.addCanvas("firstname", 1000, 1000, query, db, placement, transform, rendering, separable);





// ================== Canvas 3 ===================
placement = {};
placement.centroid_x = function (row) {return 500; };
placement.centroid_y = function (row) {return 500; };
placement.width = function (row) {return 200; };
placement.height = function (row) {return 200; };
placement.cx_col = "";
placement.cy_col = "";
placement.width_col = "";
placement.height_col = "";

rendering = function render(svg, data) {
    g = svg.append("g");
    g.selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {return d[2];})
        .attr("x", 500)
        .attr("y", 500)
        .attr("dy", ".35em")
        .attr("font-size", 50)
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1)
        .attr("data-tuple", function(d) {return d;});
};

p1.addCanvas("lastname", 1000, 1000, query, db, placement, transform, rendering, separable);
p1.initialCanvas("fullname", 500, 500, "");



// ================== fullname --> firstname, lastname ===================
var newViewport = function (row) {
    return [1, "id=" + row[0]];
};

p1.addJump("fullname", "firstname", newViewport);
p1.addJump("fullname", "lastname", newViewport);

console.log(p1);
p1.saveToDb();
