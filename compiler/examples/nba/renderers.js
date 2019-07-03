var renderingParams = {
    timelineUpperY: 510,
    timelineLowerY: 740,
    cellHeight: 55,
    playerNameCellWidth: 250,
    statsCellMaxWidth: 200,
    headerHeight: 50,
    headerbkgcolor: "#444",
    oddrowcolor: "#eaf0f7",
    evenrowcolor: "#FFF",
    headerfontsize: 18,
    headerfontcolor: "#FFF",
    bodyfontsize: 19,
    bodyfontcolor: "#111",
    playernamefontsize: 18,
    playerphotoleftmargin: 20,
    playerphotoradius: 24,
    teamlogoradius: 24,
    avgcharwidth: 20,
    shadowrectwidth: 5,
    textwrap: require("../../src/RendererTemplates").textwrap
};

var teamLogoRendering = function(svg, data) {
    g = svg.append("g");
    g.selectAll("image")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function(d) {
            return d.x - 65;
        })
        .attr("y", function(d) {
            return d.y - 65;
        })
        .attr("width", 130)
        .attr("height", 130)
        .attr("xlink:href", function(d) {
            return (
                "https://rawgit.com/tracyhenry/f0c8534bb87c6b48a8b9ee167b3a102f/raw/7724c716788e5e08079e0ec70bd0ecf834bbffea/" +
                d.abbr +
                ".svg"
            );
        });
};

var teamTimelineRendering = function(svg, data, args) {
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
    var params = args.renderingParams;

    // rect background
    g.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", function(d) {
            return +d.cx - rectWidth / 2;
        })
        .attr("y", function(d) {
            return +d.cy - d2Delta - rectHeight / 2;
        })
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
        .attr("x", function(d) {
            return +d.cx - logoXDelta;
        })
        .attr("y", function(d) {
            return +d.cy - d2Delta - logoYDelta - logoSize;
        })
        .attr("width", logoSize)
        .attr("height", logoSize)
        .attr("xlink:href", function(d) {
            return (
                "https://i.cdn.turner.com/nba/nba/assets/logos/teams/secondary/web/" +
                d.home_team +
                ".svg"
            );
        });

    // away logo
    g.selectAll(".awayimage")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function(d) {
            return +d.cx - logoXDelta;
        })
        .attr("y", function(d) {
            return +d.cy - d2Delta + logoYDelta;
        })
        .attr("width", logoSize)
        .attr("height", logoSize)
        .attr("xlink:href", function(d) {
            return (
                "https://i.cdn.turner.com/nba/nba/assets/logos/teams/secondary/web/" +
                d.away_team +
                ".svg"
            );
        });

    // home score
    g.selectAll(".homescore")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {
            return d.home_score;
        })
        .attr("x", function(d) {
            return +d.cx + scoreXDelta;
        })
        .attr("y", function(d) {
            return +d.cy - d2Delta - scoreYDelta;
        })
        .attr("font-size", scoreFontSize)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .style("fill-opacity", 1);

    // away score
    g.selectAll(".awayscore")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {
            return d.away_score;
        })
        .attr("x", function(d) {
            return +d.cx + scoreXDelta;
        })
        .attr("y", function(d) {
            return +d.cy - d2Delta + scoreYDelta;
        })
        .attr("font-size", scoreFontSize)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .style("fill-opacity", 1);

    // date
    g.selectAll(".date")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {
            return d3.timeFormat(
                "%B %d, %Y"
            )(new Date(+d.year, +d.month - 1, +d.day));
        })
        .attr("x", function(d) {
            return +d.cx;
        })
        .attr("y", function(d) {
            return +d.cy - d2Delta + rectHeight / 2 + dateYDelta;
        })
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1);

    // line
    if (data.length > 0 && "timeline" in data[0])
        g.selectAll("line")
            .data(data)
            .enter()
            .append("line")
            .attr("x1", function(d) {
                return +d.cx;
            })
            .attr("x2", function(d) {
                return +d.cx;
            })
            .attr("y1", 625)
            .attr("y2", function(d) {
                if (+d.cy == params.timelineUpperY)
                    return +d.cy - d2Delta + rectHeight / 2 + dateHeight;
                return +d.cy - d2Delta - rectHeight / 2;
            })
            .style("stroke", "#CCC")
            .style("stroke-width", 3);
};

var playByPlayRendering = function(svg, data, args) {
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
    var qtr_text = [
        "1st qtr",
        "2nd qtr",
        "3rd qtr",
        "4th qtr",
        "OT 1",
        "OT 2",
        "OT 3",
        "OT 4",
        "OT 5",
        "OT 6"
    ];

    var g = svg.append("g");
    var params = args.renderingParams;
    var height = args.canvasH;

    // extract home plays and away plays
    var homePlays = [],
        awayPlays = [];
    for (var i = 0; i < data.length; i++) {
        if (data[i].home_desc != "None") homePlays.push(data[i]);
        if (data[i].away_desc != "None") awayPlays.push(data[i]);
    }

    // home event frame
    g.selectAll(".homeframe")
        .data(homePlays)
        .enter()
        .append("path")
        .attr("d", function(d) {
            var path = "M " + (500 - centerTextWidth / 2) + " " + d.y;
            path += " l " + -triangleWidth + " " + -radius;
            path += " h " + -descBoxWidth;
            path +=
                " a " +
                radius +
                " " +
                radius +
                " 0 0 0 " +
                "0 " +
                triangleHeight;
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
        .attr("d", function(d) {
            var path = "M " + (500 + centerTextWidth / 2) + " " + d.y;
            path += " l " + triangleWidth + " " + -radius;
            path += " h " + descBoxWidth;
            path +=
                " a " +
                radius +
                " " +
                radius +
                " 0 0 1 " +
                "0 " +
                triangleHeight;
            path += " h " + -descBoxWidth;
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
        .attr(
            "x",
            500 -
                centerTextWidth / 2 -
                triangleWidth -
                descBoxWidth +
                imageOffset -
                (radius * 2 - imageMargin) / 2
        )
        .attr("y", function(d) {
            return +d.y - (radius * 2 - imageMargin) / 2;
        })
        .attr("width", radius * 2 - imageMargin)
        .attr("height", radius * 2 - imageMargin)
        .attr("xlink:href", function(d) {
            if (d.h_player_id == "None")
                return (
                    "https://i.cdn.turner.com/nba/nba/assets/logos/teams/secondary/web/" +
                    d.home_team +
                    ".svg"
                );
            return (
                "http://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/" +
                d.h_player_id +
                ".png"
            );
        })
        .style("mask", "url(#circlemask)");

    // away event image
    g.selectAll(".awayimage")
        .data(awayPlays)
        .enter()
        .append("image")
        .classed("awayimage", true)
        .attr(
            "x",
            500 +
                centerTextWidth / 2 +
                triangleWidth +
                descBoxWidth -
                imageOffset -
                (radius * 2 - imageMargin) / 2
        )
        .attr("y", function(d) {
            return +d.y - (radius * 2 - imageMargin) / 2;
        })
        .attr("width", radius * 2 - imageMargin)
        .attr("height", radius * 2 - imageMargin)
        .attr("xlink:href", function(d) {
            if (d.a_player_id == "None")
                return (
                    "https://i.cdn.turner.com/nba/nba/assets/logos/teams/secondary/web/" +
                    d.away_team +
                    ".svg"
                );
            return (
                "http://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/" +
                d.a_player_id +
                ".png"
            );
        })
        .style("mask", "url(#circlemask)");

    // home event description
    g.selectAll(".homedesc")
        .data(homePlays)
        .enter()
        .append("text")
        .text(function(d) {
            return d.home_desc;
        })
        .attr(
            "x",
            500 -
                centerTextWidth / 2 -
                triangleWidth -
                descBoxWidth / 2 +
                descOffset
        )
        .attr("y", function(d) {
            return +d.y;
        })
        .attr("font-size", descFontSize)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1)
        .call(params.textwrap, descBoxWidth - 100);

    // away event description
    g.selectAll(".awaydesc")
        .data(awayPlays)
        .enter()
        .append("text")
        .text(function(d) {
            return d.away_desc;
        })
        .attr(
            "x",
            500 +
                centerTextWidth / 2 +
                triangleWidth +
                descBoxWidth / 2 -
                descOffset
        )
        .attr("y", function(d) {
            return +d.y;
        })
        .attr("font-size", descFontSize)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1)
        .call(params.textwrap, descBoxWidth - 100);

    // center rectangle
    g.selectAll(".centerrect")
        .data(data)
        .enter()
        .append("rect")
        .attr("width", centerTextWidth)
        .attr("height", centerTextHeight)
        .attr("x", 500 - centerTextWidth / 2)
        .attr("y", function(d) {
            return +d.y - centerTextHeight / 2;
        })
        .attr("fill", "white");

    // center text
    g.selectAll(".qtrtext")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {
            return qtr_text[+d.period - 1];
        })
        .attr("x", 500)
        .attr("y", function(d) {
            return +d.y - qtrTextYDelta;
        })
        .attr("font-size", qtrTextFontSize)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1)
        .style("font-weight", "bolder");
    g.selectAll(".qtrtime")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {
            return d.qtr_time;
        })
        .attr("x", 500)
        .attr("y", function(d) {
            return +d.y;
        })
        .attr("font-size", qtrTimeFontSize)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("fill", "#eac43c")
        .style("fill-opacity", 1);
    g.selectAll(".score")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {
            return d.score;
        })
        .attr("x", 500)
        .attr("y", function(d) {
            return +d.y + scoreYDelta;
        })
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
        .attr("cy", function(d) {
            return +d.y;
        })
        .attr("r", frameCircleR)
        .style("fill", "#221f56");

    g.selectAll(".awayframecircle")
        .data(awayPlays)
        .enter()
        .append("circle")
        .attr("cx", 500 + centerTextWidth / 2)
        .attr("cy", function(d) {
            return +d.y;
        })
        .attr("r", frameCircleR)
        .style("fill", "#221f56");
};

var teamTimelineStaticBkg = function(svg, data) {
    var g = svg.append("g");

    // text
    var title = g
        .append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", 40);
    title
        .append("tspan")
        .attr("x", 500)
        .attr("y", 200)
        .html("2017~2018 Regular Season Games");
    title
        .append("tspan")
        .attr("x", 500)
        .attr("dy", 70)
        .html(data[0].city + " " + data[0].name);

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
        .attr("xlink:href", function() {
            return (
                "https://rawgit.com/tracyhenry/f0c8534bb87c6b48a8b9ee167b3a102f/raw/7724c716788e5e08079e0ec70bd0ecf834bbffea/" +
                data[0].abbr +
                ".svg"
            );
        })
        .style("opacity", 0.07);
};

var playByPlayStaticBkg = function(svg, data) {
    var g = svg.append("g");
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
        .attr("xlink:href", function(d) {
            return (
                "https://rawgit.com/tracyhenry/f0c8534bb87c6b48a8b9ee167b3a102f/raw/7724c716788e5e08079e0ec70bd0ecf834bbffea/" +
                data[0].abbr1 +
                ".svg"
            );
        })
        .style("opacity", 0.07);
    g.append("image")
        .attr("x", 550)
        .attr("y", 300)
        .attr("width", 400)
        .attr("height", 400)
        .attr("xlink:href", function(d) {
            return (
                "https://rawgit.com/tracyhenry/f0c8534bb87c6b48a8b9ee167b3a102f/raw/7724c716788e5e08079e0ec70bd0ecf834bbffea/" +
                data[0].abbr2 +
                ".svg"
            );
        })
        .style("opacity", 0.07);
};

var boxscorePkRendering = function(svg, data, args) {
    // create a new g
    var g = svg.append("g");
    var height = args.viewportH;
    var params = args.renderingParams;

    // precompute some stuff
    var headerStartHeight =
        height / 2 -
        ((data.length + 1) * params.cellHeight + params.headerHeight) / 2;
    var firstRowHeight = headerStartHeight + params.headerHeight;

    // shadow filter def
    g.append("defs")
        .append("filter")
        .attr("id", "rectshadow")
        .append("feDropShadow")
        .attr("dx", 0)
        .attr("dy", 10)
        .attr("stdDeviation", 4);

    // playername header bkg rect
    g.append("rect")
        .attr("width", params.playerNameCellWidth)
        .attr("height", params.headerHeight)
        .attr("x", 0)
        .attr("y", headerStartHeight)
        .style("fill", params.headerbkgcolor);

    // playername header text
    g.append("text")
        .text("Players")
        .attr("x", params.playerNameCellWidth / 2)
        .attr("y", headerStartHeight + params.headerHeight / 2)
        .attr("dy", ".35em")
        .attr("font-size", params.headerfontsize)
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1)
        .style("fill", params.headerfontcolor);

    // player name bkg rect
    g.selectAll(".playernamerect")
        .data(data)
        .enter()
        .append("rect")
        .attr("width", params.playerNameCellWidth)
        .attr("height", params.cellHeight)
        .attr("x", 0)
        .attr("y", function(d, i) {
            return firstRowHeight + i * params.cellHeight;
        })
        .style("fill", function(d, i) {
            if (i % 2 == 0) return params.evenrowcolor;
            return params.oddrowcolor;
        });

    // player photos
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
    g.selectAll(".playerphoto")
        .data(data)
        .enter()
        .append("image")
        .attr("width", params.playerphotoradius * 2)
        .attr("height", params.playerphotoradius * 2)
        .attr("x", params.playerphotoleftmargin)
        .attr("y", function(d, i) {
            return (
                firstRowHeight +
                (i + 0.5) * params.cellHeight -
                params.playerphotoradius
            );
        })
        .attr("xlink:href", function(d) {
            if (d.player_id == "None")
                return (
                    "https://i.cdn.turner.com/nba/nba/assets/logos/teams/secondary/web/" +
                    d.team_abbr +
                    ".svg"
                );
            return (
                "http://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/" +
                d.player_id +
                ".png"
            );
        })
        .style("mask", "url(#circlemask)");

    // playernames
    g.selectAll(".playername")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {
            return d.player_name;
        })
        .attr("x", function() {
            //console.log(d);
            var textLeft =
                params.playerphotoleftmargin + params.playerphotoradius * 2;
            //return (params.playerNameCellWidth - textLeft) / 2 + textLeft;
            return textLeft + 15;
        })
        .attr("y", function(d, i) {
            return firstRowHeight + (i + 0.5) * params.cellHeight;
        })
        .attr("dy", ".35em")
        .attr("font-size", params.playernamefontsize)
        .attr("text-anchor", "left")
        .style("fill-opacity", 1)
        .style("fill", params.bodyfontcolor)
        .call(
            params.textwrap,
            params.playerNameCellWidth -
                params.playerphotoradius * 2 -
                params.playerphotoleftmargin -
                25
        );

    // team logo
    if (data.length > 0) {
        var startHeight =
            height / 2 -
            ((data.length + 1) * params.cellHeight + params.headerHeight) / 2 +
            params.headerHeight +
            params.cellHeight * data.length;

        // background rect
        g.append("rect")
            .attr("width", params.playerNameCellWidth)
            .attr("height", params.cellHeight)
            .attr("x", 0)
            .attr("y", startHeight)
            .style(
                "fill",
                data.length % 2 == 0 ? params.evenrowcolor : params.oddrowcolor
            );

        // team logo
        g.append("image")
            .attr("x", params.playerNameCellWidth / 2 - params.teamlogoradius)
            .attr(
                "y",
                startHeight + params.cellHeight / 2 - params.teamlogoradius
            )
            .attr("width", params.teamlogoradius * 2)
            .attr("height", params.teamlogoradius * 2)
            .attr(
                "xlink:href",
                "https://i.cdn.turner.com/nba/nba/assets/logos/teams/secondary/web/" +
                    data[0].team_abbr +
                    ".svg"
            );
    }

    // shadow rect
    g.append("rect")
        .attr("width", params.shadowrectwidth)
        .attr(
            "height",
            params.headerHeight + (data.length + 1) * params.cellHeight
        )
        .attr("x", params.playerNameCellWidth - params.shadowrectwidth)
        .attr("y", headerStartHeight)
        .style("fill", "white");
};

var boxscoreStatsRendering = function(svg, data, args) {
    // create a new g
    var g = svg.append("g");
    var height = args.canvasH;
    var params = args.renderingParams;

    // precompute some stuff
    var headerStartHeight =
        height / 2 -
        ((data.length + 1) * params.cellHeight + params.headerHeight) / 2;
    var firstRowHeight = headerStartHeight + params.headerHeight;
    var avg_fields = ["FG_PCT", "FG3_PCT", "FT_PCT"];
    var fields = [
        "id",
        "game_id",
        "team_id",
        "team_abbr",
        "team_city",
        "player_id",
        "player_name",
        "start_position",
        "min",
        "pts",
        "fgm",
        "fga",
        "fg_pct",
        "fg3m",
        "fg3a",
        "fg3_pct",
        "ftm",
        "fta",
        "ft_pct",
        "oreb",
        "dreb",
        "reb",
        "ast",
        "stl",
        "blk",
        "turnover",
        "pf",
        "plus_minus"
    ];

    // loop over stats
    var curLeft = params.playerNameCellWidth;
    for (var i = 7; i < fields.length; i++) {
        // get precision
        var precision = 0;
        if (avg_fields.indexOf(fields[i]) != -1) precision = 2;

        // display name of the current field
        var displayName =
            fields[i] == "turnover"
                ? "TO"
                : fields[i] == "plus_minus"
                ? "+/-"
                : fields[i] == "start_position"
                ? "POS"
                : fields[i].toUpperCase();

        var curColumnWidth = Math.min(
            displayName.length * params.avgcharwidth,
            params.statsCellMaxWidth
        );
        // stats header bkg rect
        g.append("rect")
            .attr("width", curColumnWidth)
            .attr("height", params.headerHeight)
            .attr("x", curLeft)
            .attr("y", headerStartHeight)
            .style("fill", params.headerbkgcolor);

        // stats header text
        g.append("text")
            .text(displayName)
            .attr("x", curLeft + curColumnWidth / 2)
            .attr("y", headerStartHeight + params.headerHeight / 2)
            .attr("dy", ".35em")
            .attr("font-size", params.headerfontsize)
            .attr("text-anchor", "middle")
            .style("fill-opacity", 1)
            .style("fill", params.headerfontcolor);

        // player stats bkg rect
        g.selectAll(".playerstatsrect")
            .data(data)
            .enter()
            .append("rect")
            .attr("width", curColumnWidth)
            .attr("height", params.cellHeight)
            .attr("x", curLeft)
            .attr("y", function(d, i) {
                return firstRowHeight + i * params.cellHeight;
            })
            .style("fill", function(d, i) {
                if (i % 2 == 0) return params.evenrowcolor;
                return params.oddrowcolor;
            });

        // player stats text
        g.selectAll(".playerstatstext")
            .data(data)
            .enter()
            .append("text")
            .text(function(d) {
                return fields[i] == "start_position"
                    ? d[fields[i]]
                    : (+d[fields[i]]).toFixed(precision);
            })
            .attr("x", curLeft + curColumnWidth / 2)
            .attr("y", function(d, i) {
                return firstRowHeight + (i + 0.5) * params.cellHeight;
            })
            .attr("font-size", params.bodyfontsize)
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .style("fill-opacity", 1)
            .style("fill", params.bodyfontcolor);

        // team stats bkg rect
        var startHeight =
            height / 2 -
            ((data.length + 1) * params.cellHeight + params.headerHeight) / 2 +
            params.headerHeight +
            params.cellHeight * data.length;
        g.append("rect")
            .attr("width", curColumnWidth)
            .attr("height", params.cellHeight)
            .attr("x", curLeft)
            .attr("y", startHeight)
            .style(
                "fill",
                data.length % 2 == 0 ? params.evenrowcolor : params.oddrowcolor
            );

        // team stats text
        if (fields[i] != "start_position") {
            var overall = 0;
            for (var j = 0; j < data.length; j++)
                overall += +data[j][fields[i]];
            if (avg_fields.indexOf(fields[i]) != -1)
                overall = overall / data.length;
            else if (fields[i] == "PLUS_MINUS") overall = overall / 5;
            g.append("text")
                .text(overall.toFixed(precision))
                .attr("x", curLeft + curColumnWidth / 2)
                .attr("y", startHeight + params.cellHeight / 2)
                .attr("font-size", params.bodyfontsize)
                .attr("text-anchor", "middle")
                .attr("dy", ".35em")
                .style("fill-opacity", 1)
                .style("fill", params.bodyfontcolor);
        }
        curLeft += curColumnWidth;
    }
};

module.exports = {
    renderingParams: renderingParams,
    teamLogoRendering: teamLogoRendering,
    teamTimelineRendering: teamTimelineRendering,
    teamTimelineStaticBkg: teamTimelineStaticBkg,
    playByPlayRendering: playByPlayRendering,
    playByPlayStaticBkg: playByPlayStaticBkg,
    boxscorePkRendering: boxscorePkRendering,
    boxscoreStatsRendering: boxscoreStatsRendering
};
