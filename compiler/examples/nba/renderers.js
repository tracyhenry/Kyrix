var teamLogoRendering = function render(svg, data) {
    g = svg.append("g");
    g.selectAll("image")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function (d) {return d[1] - 65;})
        .attr("y", function (d) {return d[2] - 65;})
        .attr("width", 130)
        .attr("height", 130)
        .attr("xlink:href", function (d) {return "/static/images/nba/team_logo/" + d[5].toLowerCase() + ".svg";});
};

var teamTimelineRendering = function render(svg, data) {

    var rectWidth = 160;
    var rectHeight = 100;
    var logoXDelta = 60;
    var logoYDelta = 6;
    var logoSize = 32;
    var scoreFontSize = 20;
    var scoreXDelta = 60;
    var scoreYDelta = 24;
    var dateYDelta = 10;
    var dateHeight = 30;

    g = svg.append("g");

    // rect background
    g.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", function (d) {return d[1] - rectWidth / 2;})
        .attr("y", function (d) {return d[2] - rectHeight / 2;})
        .attr("rx", 10)
        .attr("ry", 10)
        .attr("width", rectWidth)
        .attr("height", rectHeight + dateHeight)
        .style("fill", "#FFF")
        .style("stroke", "#CCC")
        .style("stroke-width", 3);

    // home logo
    g.selectAll(".homeimage")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function (d) {return d[1] - logoXDelta;})
        .attr("y", function (d) {return d[2] - logoYDelta - logoSize;})
        .attr("width", logoSize)
        .attr("height", logoSize)
        .attr("xlink:href", function (d) {return "/static/images/nba/team_logo/" + d[6].toLowerCase() + ".svg";});

    // away logo
    g.selectAll(".awayimage")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function (d) {return d[1] - logoXDelta;})
        .attr("y", function (d) {return +d[2] + logoYDelta;})
        .attr("width", logoSize)
        .attr("height", logoSize)
        .attr("xlink:href", function (d) {return "/static/images/nba/team_logo/" + d[7].toLowerCase() + ".svg";});

    // home score
    g.selectAll(".homescore")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {return d[8]})
        .attr("x", function(d) {return +d[1] + scoreXDelta;})
        .attr("y", function(d) {return d[2] - scoreYDelta;})
        .attr("font-size", scoreFontSize)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .style("fill-opacity", 1);

    // away score
    g.selectAll(".awayscore")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {return d[9]})
        .attr("x", function(d) {return +d[1] + scoreXDelta;})
        .attr("y", function(d) {return +d[2] + scoreYDelta;})
        .attr("font-size", scoreFontSize)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .style("fill-opacity", 1);

    // date
    g.selectAll(".date")
        .data(data)
        .enter()
        .append("text")
        .text(function (d) {return d3.timeFormat("%B %d, %Y")(new Date(d[3], d[4] - 1, d[5]));})
        .attr("x", function (d) {return +d[1];})
        .attr("y", function (d) {return +d[2] + rectHeight / 2 + dateYDelta;})
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1);

    // line
    g.selectAll("line")
        .data(data)
        .enter()
        .append("line")
        .attr("x1", function (d) {return d[1];})
        .attr("x2", function (d) {return d[1];})
        .attr("y1", 625)
        .attr("y2", function (d) {
            if (d[2] == 495) return +d[2] + rectHeight / 2 + dateHeight;
            return d[2] - rectHeight / 2;
        })
        .style("stroke", "#CCC")
        .style("stroke-width", 3);
};

var teamTimelineStaticTrim = function (g, args) {

    var team_string = args[0];

    // text
    var title = g.append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", 40);
    title.append("tspan")
        .attr("x", 500)
        .attr("y", 200)
        .html("2017~2018 Regular Season Games");
    title.append("tspan")
        .attr("x", 500)
        .attr("dy", 70).html(team_string);

    // axis line
    g.append("line")
        .attr("x1", 0)
        .attr("y1", 625)
        .attr("x2", 1000)
        .attr("y2", 625)
        .style("stroke", "#CCC")
        .style("stroke-width", 3);

    // team logo background
    var teamName = team_string.split(" ");
    teamName = teamName[teamName.length - 1];
    g.append("image")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 1000)
        .attr("height", 1000)
        .attr("xlink:href", function (d) {return "static/images/nba/team_logo/" + teamName + ".svg";})
        .style("opacity", 0.07);
};

module.exports = {
    teamLogoRendering : teamLogoRendering,
    teamTimelineRendering : teamTimelineRendering,
    teamTimelineStaticTrim : teamTimelineStaticTrim
};
