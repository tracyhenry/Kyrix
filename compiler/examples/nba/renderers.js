var teamLogoRendering = function render(svg, data) {
    g = svg.append("g");
    g.selectAll("image")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function(d) {return d[1];})
        .attr("y", function(d) {return d[2];})
        .attr("width", 130)
        .attr("height", 130)
        .attr("xlink:href", function(d){return "/static/images/nba/team_logo/" + d[5] + ".svg";});
};

module.exports = {
    teamLogoRendering : teamLogoRendering
};
