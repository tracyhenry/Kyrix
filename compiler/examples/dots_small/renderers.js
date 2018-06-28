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
                return "#f2f";
            else
                return "#ea3";
        });
};

module.exports = {
    dotsRendering: dotsRendering
};
