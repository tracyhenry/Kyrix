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

var c1L2Rendering = function render(svg, data) {
    g = svg.append("g");
    g.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", function(d) {return d[3] - 80;})
        .attr("y", function(d) {return d[4] - 80;})
        .attr("width", 160)
        .attr("height", 160)
        .style("fill", "pink")
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

// an empty g with a background color fill
var c1L3Rendering = function render(svg, data) {
    g = svg.append("g")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 5000)
        .attr("height", 5000)
        .style("fill", "beige");
};

var c2L1Rendering = function render(svg, data) {
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

var c3L1Rendering = function render(svg, data) {
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

// exports
module.exports = {
    c1L1Rendering : c1L1Rendering,
    c1L2Rendering : c1L2Rendering,
    c1L3Rendering : c1L3Rendering,
    c2L1Rendering : c2L1Rendering,
    c3L1Rendering : c3L1Rendering
};
