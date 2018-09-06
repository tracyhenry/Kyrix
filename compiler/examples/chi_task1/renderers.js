var scPlotRendering = function (svg, data) {
    var g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {return d[1];})
        .attr("cy", function(d) {return d[2];})
        .attr("r", 2)
        .style("stroke", "#CCC")
        .style("fill", "blue");
};

var scPlotStaticTrim = function (svg) {

    var g = svg.append("g");
    g.append("text")
        .text("Let's go Kyrix!")
        .attr("x", 400)
        .attr("y", 400)
        .attr("dy", ".35em")
        .attr("font-size", 50)
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1);
};

module.exports = {
    scPlotRendering : scPlotRendering,
    scPlotStaticTrim : scPlotStaticTrim
};
