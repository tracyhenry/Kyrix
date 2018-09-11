var fullNameCircleRendering = function (svg, data) {
    g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {return d[3];})
        .attr("cy", function(d) {return d[4];})
        .attr("r", 80)
        .style("fill", "orange");
    g.selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {return d[1] + " " + d[2];})
        .attr("x", function(d) {return d[3];})
        .attr("y", function(d) {return d[4];})
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1);
};

var fullNameRectangleRendering = function (svg, data) {
    g = svg.append("g");
    g.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", function(d) {return d[3] - 80;})
        .attr("y", function(d) {return d[4] - 80;})
        .attr("width", 160)
        .attr("height", 160)
        .style("fill", "pink");
    g.selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {return d[1] + " " + d[2];})
        .attr("x", function(d) {return d[3];})
        .attr("y", function(d) {return d[4];})
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1);
};

// an empty g with a background color fill
var fullNameBkgRendering = function (svg, data) {
    g = svg.append("g")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 5000)
        .attr("height", 5000)
        .style("fill", "beige");
};

var firstNameRendering = function (svg, data) {

    g = svg.append("g");
    g.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 1000)
        .attr("height", 1000)
        .style("fill", "beige");
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
        .style("fill-opacity", 1);
};

var lastNameRendering = function (svg, data) {
    g = svg.append("g");
    g.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 1000)
        .attr("height", 1000)
        .style("fill", "beige");

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
        .style("fill-opacity", 1);

};

var fullNameStaticRendering = function (svg) {

    var g = svg.append("g");
    g.append("text")
        .text("Let's go Kyrix!")
        .attr("x", 500)
        .attr("y", 500)
        .attr("dy", ".35em")
        .attr("font-size", 50)
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1);
};

// exports
module.exports = {
    fullNameCircleRendering : fullNameCircleRendering,
    fullNameRectangleRendering : fullNameRectangleRendering,
    fullNameBkgRendering : fullNameBkgRendering,
    firstNameRendering : firstNameRendering,
    lastNameRendering : lastNameRendering,
    fullNameStaticRendering : fullNameStaticRendering
};
