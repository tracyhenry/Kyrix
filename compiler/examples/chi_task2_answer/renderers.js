var renderingParams = {
    "timelineUpperY" : 510,
    "timelineLowerY" : 740,
    "cellHeight" : 55,
    "playerNameCellWidth" : 250,
    "statsCellMaxWidth" : 200,
    "headerHeight" : 50,
    "headerbkgcolor" : "#444",
    "oddrowcolor" : "#eaf0f7",
    "evenrowcolor" : "#FFF",
    "headerfontsize" : 18,
    "headerfontcolor" : "#FFF",
    "bodyfontsize" : 19,
    "bodyfontcolor" : "#111",
    "playernamefontsize" : 18   ,
    "playerphotoleftmargin" : 20,
    "playerphotoradius" : 24,
    "teamlogoradius" : 24,
    "avgcharwidth" : 20,
    "shadowrectwidth" : 5,
    "textwrap" : function textwrap(text, width) {
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.3, // ems
                x = text.attr("x"),
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", x).attr("y", y);

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", x).attr("y", y).text(word);
                }
            }
            var tspans = text.selectAll("tspan"), num_tspans = tspans.size();
            var firstY;
            if (num_tspans % 2 == 0)
                firstY = - (num_tspans / 2 - 0.5) * lineHeight;
            else
                firstY = - Math.floor(num_tspans / 2) * lineHeight;
            tspans.attr("dy", function (d, i) {
                return (firstY + lineHeight * i) + 0.35 + "em";
            });
        });
    }
};

var teamLogoRendering = function (svg, data) {
    g = svg.append("g");
    g.selectAll("image")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function (d) {return d[1] - 65;})
        .attr("y", function (d) {return d[2] - 65;})
        .attr("width", 130)
        .attr("height", 130)
        .attr("xlink:href", function (d) {return "https://rawgit.com/tracyhenry/f0c8534bb87c6b48a8b9ee167b3a102f/raw/7724c716788e5e08079e0ec70bd0ecf834bbffea/" + d[6] + ".svg";});
};

var teamTimelineRendering = function (svg, data, width, height, params) {

    var rectWidth = 160;
    var rectHeight = 100;
    var logoXDelta = 60;
    var logoYDelta = 6;
    var logoSize = 35;
    var scoreFontSize = 20;
    var scoreXDelta = 60;
    var scoreYDelta = 24;
    var dateYDelta = 10;
    var dateHeight = 30;
    var d2Delta = 15;

    g = svg.append("g");

    // rect background
    g.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", function (d) {return d[1] - rectWidth / 2;})
        .attr("y", function (d) {return d[2] - d2Delta - rectHeight / 2;})
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
        .attr("y", function (d) {return d[2] - d2Delta - logoYDelta - logoSize;})
        .attr("width", logoSize)
        .attr("height", logoSize)
        .attr("xlink:href", function (d) {return "https://i.cdn.turner.com/nba/nba/assets/logos/teams/secondary/web/" + d[6] + ".svg";});

    // away logo
    g.selectAll(".awayimage")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function (d) {return d[1] - logoXDelta;})
        .attr("y", function (d) {return d[2] - d2Delta + logoYDelta;})
        .attr("width", logoSize)
        .attr("height", logoSize)
        .attr("xlink:href", function (d) {return "https://i.cdn.turner.com/nba/nba/assets/logos/teams/secondary/web/" + d[7] + ".svg";});

    // home score
    g.selectAll(".homescore")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {return d[8]})
        .attr("x", function(d) {return +d[1] + scoreXDelta;})
        .attr("y", function(d) {return d[2] - d2Delta - scoreYDelta;})
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
        .attr("y", function(d) {return d[2] - d2Delta + scoreYDelta;})
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
        .attr("y", function (d) {return d[2] - d2Delta + rectHeight / 2 + dateYDelta;})
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
            if (d[2] == params.timelineUpperY) return d[2] - d2Delta + rectHeight / 2 + dateHeight;
            return d[2] - d2Delta - rectHeight / 2;
        })
        .style("stroke", "#CCC")
        .style("stroke-width", 3);
};

var teamTimelineStaticBkg = function (svg, data) {

    var g = svg.append("g");

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
        .attr("dy", 70).html(data[0][0] + " " + data[0][1]);

    // axis line
    g.append("line")
        .attr("x1", -1000)
        .attr("y1", 625)
        .attr("x2", 2000)
        .attr("y2", 625)
        .style("stroke", "#CCC")
        .style("stroke-width", 3);

    // team logo background
    g.append("image")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 1000)
        .attr("height", 1000)
        .attr("xlink:href", function (d) {return "https://rawgit.com/tracyhenry/f0c8534bb87c6b48a8b9ee167b3a102f/raw/7724c716788e5e08079e0ec70bd0ecf834bbffea/" + data[0][2] + ".svg";})
        .style("opacity", 0.07);
};

module.exports = {
    renderingParams : renderingParams,
    teamLogoRendering : teamLogoRendering,
    teamTimelineRendering : teamTimelineRendering,
    teamTimelineStaticBkg : teamTimelineStaticBkg
};
