var dotsRendering = function (svg, data) {
    g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function (d) {return d[1];})
        .attr("cy", function (d) {return d[2];})
        .attr("r", 1)
        .attr("fill", function (d) {
            if (d[3] == 0)
                return "#145bce";
            else
                return "#0b9e2d";
        });
};

module.exports = {
    dotsRendering: dotsRendering
};
