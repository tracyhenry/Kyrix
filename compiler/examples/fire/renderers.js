var fireRendering = function(svg, data, args) {
    var sizeScale = d3
        .scaleSqrt()
        .domain([0, 10000])
        .range([15, 50]);
    var g = svg.append("g");
    g.style("opacity", 0);
    g.selectAll(".fire")
        .data(data)
        .enter()
        .append("image")
        .classed("kyrix-retainsizezoom", true)
        .attr("x", d => d.cx - sizeScale(d.fire_size) / 2)
        .attr("y", d => d.cy - sizeScale(d.fire_size) / 2)
        .attr("width", d => sizeScale(d.fire_size))
        .attr("height", d => sizeScale(d.fire_size))
        .attr(
            "xlink:href",
            "https://images.vexels.com/media/users/3/146888/isolated/preview/1e91f6545e3496c986ba7064379d2ad9-fire-burning-illustration-by-vexels.png"
        );

    // fade in
    g.transition()
        .duration(150)
        .style("opacity", 1);
};

module.exports = {fireRendering};
