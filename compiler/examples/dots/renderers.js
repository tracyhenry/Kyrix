var dotsRendering = function (svg, data) {
    g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function (d) {return d[1];})
        .attr("cy", function (d) {return d[2];})
        .attr("r", 1)
        .attr("fill", "#145bce");
};

module.exports = {
    dotsRendering: dotsRendering
};
