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
        .attr("xlink:href", function (d) {return "https://rawgit.com/tracyhenry/f0c8534bb87c6b48a8b9ee167b3a102f/raw/7724c716788e5e08079e0ec70bd0ecf834bbffea/" + d[6] + ".svg";});
};

var teamTimelineRendering = function render(svg, data) {

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
        .attr("xlink:href", function (d) {return "https://i.cdn.turner.com/nba/nba/assets/logos/teams/secondary/web/" + d[6] + ".svg";});

    // away logo
    g.selectAll(".awayimage")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function (d) {return d[1] - logoXDelta;})
        .attr("y", function (d) {return +d[2] + logoYDelta;})
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

var playByPlayRendering = function render(svg, data) {

    function wrap(text, width) {

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
    };

    var centerTextWidth = 100;
    var centerTextHeight = 100;
    var triangleHeight = 80;
    var triangleWidth = 50;
    var frameCircleR = 4;
    var descBoxWidth = 320;
    var radius = triangleHeight / 2;
    var imageMargin = 5;
    var imageOffset = 10;
    var descFontSize = 17;
    var descOffset = 20;
    var qtrTextFontSize = 20;
    var qtrTimeFontSize = 16;
    var scoreFontSize = 18;
    var qtrTextYDelta = 23;
    var scoreYDelta = 23;
    var qtr_text = ["1st qtr", "2nd qtr", "3rd qtr", "4th qtr",
        "OT 1", "OT 2", "OT 3", "OT 4", "OT 5", "OT 6"];

    var g = svg.append("g");

    // extract home plays and away plays
    var homePlays = [], awayPlays = [];
    for (var i = 0; i < data.length; i ++) {
        if (data[i][6] != "None")
            homePlays.push(data[i]);
        if (data[i][7] != "None")
            awayPlays.push(data[i]);
    }

    // home event frame
    g.selectAll(".homeframe")
        .data(homePlays)
        .enter()
        .append("path")
        .attr("d", function (d) {
            var path = "M " + (500 - centerTextWidth / 2) + " " + d[1];
            path += " l " + (-triangleWidth) + " " + (-radius);
            path += " h " + (-descBoxWidth);
            path += " a " + radius + " " + radius + " 0 0 0 " + "0 " + triangleHeight;
            path += " h " + descBoxWidth;
            path += " z";
            return path;
        })
        .attr("fill", "white")
        .style("stroke", "#CCC")
        .style("stroke-width", 1.5);

    // away event frame
    g.selectAll(".awayframe")
        .data(awayPlays)
        .enter()
        .append("path")
        .attr("d", function (d) {
            var path = "M " + (500 + centerTextWidth / 2) + " " + d[1];
            path += " l " + triangleWidth + " " + (-radius);
            path += " h " + descBoxWidth;
            path += " a " + radius + " " + radius + " 0 0 1 " + "0 " + triangleHeight;
            path += " h " + (-descBoxWidth);
            path += " z";
            return path;
        })
        .attr("fill", "white")
        .style("stroke", "#CCC")
        .style("stroke-width", 1.5);

    // image mask
    g.append("defs")
        .append("mask")
        .attr("id", "circlemask")
        .attr("maskUnits", "objectBoundingBox")
        .attr("maskContentUnits", "objectBoundingBox")
        .append("circle")
        .attr("cx", "0.5")
        .attr("cy", "0.5")
        .attr("r", "0.5")
        .attr("fill", "white");

    // home event image
    g.selectAll(".homeimage")
        .data(homePlays)
        .enter()
        .append("image")
        .classed("homeimage", true)
        .attr("x", 500 - centerTextWidth / 2 - triangleWidth - descBoxWidth + imageOffset - (radius * 2 - imageMargin) / 2)
        .attr("y", function (d) {return d[1] - (radius * 2 - imageMargin) / 2;})
        .attr("width", radius * 2 - imageMargin)
        .attr("height", radius * 2 - imageMargin)
        .attr("xlink:href", function (d) {
            if (d[10] == "None")
                return "https://i.cdn.turner.com/nba/nba/assets/logos/teams/secondary/web/" + d[8] + ".svg";
            return "http://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/" + d[10] + ".png";
        })
        .style("mask", "url(#circlemask)");

    // away event image
    g.selectAll(".awayimage")
        .data(awayPlays)
        .enter()
        .append("image")
        .classed("awayimage", true)
        .attr("x", 500 + centerTextWidth / 2 + triangleWidth + descBoxWidth -imageOffset - (radius * 2 - imageMargin) / 2)
        .attr("y", function (d) {return d[1] - (radius * 2 - imageMargin) / 2;})
        .attr("width", radius * 2 - imageMargin)
        .attr("height", radius * 2 - imageMargin)
        .attr("xlink:href", function (d) {
            if (d[11] == "None")
                return "https://i.cdn.turner.com/nba/nba/assets/logos/teams/secondary/web/" + d[9] + ".svg";
            return "http://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/" + d[11] + ".png";
        })
        .style("mask", "url(#circlemask)");

    // home event description
    g.selectAll(".homedesc")
        .data(homePlays)
        .enter()
        .append("text")
        .text(function (d) {return d[6];})
        .attr("x", 500 - centerTextWidth / 2 - triangleWidth - descBoxWidth / 2 + descOffset)
        .attr("y", function (d) {return d[1];})
        .attr("font-size", descFontSize)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1)
        .call(wrap, descBoxWidth - 100);

    // away event description
    g.selectAll(".awaydesc")
        .data(awayPlays)
        .enter()
        .append("text")
        .text(function (d) {return d[7];})
        .attr("x", 500 + centerTextWidth / 2 + triangleWidth + descBoxWidth / 2 - descOffset)
        .attr("y", function (d) {return d[1];})
        .attr("font-size", descFontSize)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1)
        .call(wrap, descBoxWidth - 100);

    // center rectangle
    g.selectAll(".centerrect")
        .data(data)
        .enter()
        .append("rect")
        .attr("width", centerTextWidth)
        .attr("height", centerTextHeight)
        .attr("x", 500 - centerTextWidth / 2)
        .attr("y", function (d) {return d[1] - centerTextHeight / 2;})
        .attr("fill", "white");

    // center text
    g.selectAll(".qtrtext")
        .data(data)
        .enter()
        .append("text")
        .text(function (d) {return qtr_text[d[2] - 1];})
        .attr("x", 500)
        .attr("y", function (d) {return d[1] - qtrTextYDelta;})
        .attr("font-size", qtrTextFontSize)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1)
        .style("font-weight", "bolder");
    g.selectAll(".qtrtime")
        .data(data)
        .enter()
        .append("text")
        .text(function (d) {return d[3];})
        .attr("x", 500)
        .attr("y", function (d) {return d[1];})
        .attr("font-size", qtrTimeFontSize)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("fill", "#eac43c")
        .style("fill-opacity", 1);
    g.selectAll(".score")
        .data(data)
        .enter()
        .append("text")
        .text(function (d) {return d[4];})
        .attr("x", 500)
        .attr("y", function (d) {return +d[1] + scoreYDelta;})
        .attr("font-size", scoreFontSize)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("fill", "#4144e2")
        .style("fill-opacity", 1);

    // frame circles
    g.selectAll(".homeframecircle")
        .data(homePlays)
        .enter()
        .append("circle")
        .attr("cx", 500 - centerTextWidth / 2)
        .attr("cy", function (d) {return d[1];})
        .attr("r", frameCircleR)
        .style("fill", "#221f56");

    g.selectAll(".awayframecircle")
        .data(awayPlays)
        .enter()
        .append("circle")
        .attr("cx", 500 + centerTextWidth / 2)
        .attr("cy", function (d) {return d[1];})
        .attr("r", frameCircleR)
        .style("fill", "#221f56");

};

var teamTimelineStaticBkg = function (g, data) {

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

var playByPlayStaticBkg = function (g, data) {

    // axis line
    g.append("line")
        .attr("x1", 500)
        .attr("y1", -1000)
        .attr("x2", 500)
        .attr("y2", 2000)
        .style("stroke", "#CCC")
        .style("stroke-width", 3);

    // team logo background
    g.append("image")
        .attr("x", 50)
        .attr("y", 300)
        .attr("width", 400)
        .attr("height", 400)
        .attr("xlink:href", function (d) {return "https://rawgit.com/tracyhenry/f0c8534bb87c6b48a8b9ee167b3a102f/raw/7724c716788e5e08079e0ec70bd0ecf834bbffea/" + data[0][0] + ".svg";})
        .style("opacity", 0.07);
    g.append("image")
        .attr("x", 550)
        .attr("y", 300)
        .attr("width", 400)
        .attr("height", 400)
        .attr("xlink:href", function (d) {return "https://rawgit.com/tracyhenry/f0c8534bb87c6b48a8b9ee167b3a102f/raw/7724c716788e5e08079e0ec70bd0ecf834bbffea/" + data[0][1] + ".svg";})
        .style("opacity", 0.07);
};


module.exports = {
    teamLogoRendering : teamLogoRendering,
    teamTimelineRendering : teamTimelineRendering,
    teamTimelineStaticBkg : teamTimelineStaticBkg,
    playByPlayRendering: playByPlayRendering,
    playByPlayStaticBkg : playByPlayStaticBkg
};
