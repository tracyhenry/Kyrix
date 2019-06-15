var dotsRendering = function (svg, data) {
    g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function (d) {return d.x;})
        .attr("cy", function (d) {return d.y;})
        .attr("r", 10)
        .attr("fill", "#145bce");
};

module.exports = {
    dotsRendering: dotsRendering
};
