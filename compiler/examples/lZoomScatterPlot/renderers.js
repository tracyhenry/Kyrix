var scPlotRendering = function render(svg, data) {
    g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {return d[1];})
        .attr("cy", function(d) {return d[2];})
        .attr("r", 13)
        .style("stroke", "#CCC")
        .style("fill", function (d){
            var colors = ["orange", "red", "blue", "green", "purple"];
            return colors[d[3]];
        })
        .attr("data-tuple", function(d) {return d;});
};

module.exports = {
    scPlotRendering : scPlotRendering
}