var renderingParams = {
	overallMapScale: 285000,
    insetMapScale: 712500
};

var overallMapRendering = function(svg, data, args) {
    g = svg.append("g");
    var width = args.canvasW,
        height = args.canvasH;
    var param = args.renderingParams;

    var projection = d3
        .geoAlbers()
        .scale(param.overallMapScale)
        .rotate([71.06, 0])
        .center([0,42.32])
        .translate([width / 2, height / 2]);
    var path = d3.geoPath().projection(projection);

    g.selectAll("path")
        .data(data)
        .enter()
        .append("path")
        .attr("d", function(d) {
            var feature = JSON.parse(d.geometry);
            return path(feature);
        })
        .style("stroke", "#000")
        .style("stroke-width", "2")
        .style("fill", "white");
}

var stationsRendering = function(svg, data, args) {
    g = svg.append("g");
    var width = args.canvasW,
        height = args.canvasH;
    var param = args.renderingParams;

    var color = d3.scaleLinear()
        .domain([5,25,50])
        .range([0.2,0.9,1]); 

    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {return d.bbox_x;})
        .attr("cy", function(d) {return d.bbox_y;})
        .attr("r", 6)
        .attr("fill", "#0059d6")
        .style("opacity", function(d) {return color(d.num_docks);})
        .on("mouseover", function(d, i) {
            // remove all tool tips first
            d3.select("body")
                .selectAll(".tooltip")
                .remove();
            // create a new tooltip
            var tooltip = d3
                .select("body")
                .append("div")
                .attr("id", "tooltip" + i)
                .classed("tooltip", true)
                .style("position", "absolute")
                .style("width", 300)
                .style("height", 50)
                .style("pointer-events", "none")
                .style("opacity", 1)
                .style("font-size", 24)
                .style("color", "#0059d6");
            tooltip
                .transition()
                .duration(200)
                .style("opacity", 0.9);
            tooltip
                .html(d.name)
                .style("left", 850)
                .style("top", 900);
        })
        .on("mouseout", function(d, i) {
            d3.select("#tooltip" + i).remove();
        });;
}

var titleRendering = function(svg) {
    g = svg.append("g")
        .append("text")
        .text("CitiBike Usage in Boston")
        .attr("x", 410)
        .attr("y", 50)
        .attr("font-size", 52)
        .attr("fill", "#0059d6");
}

var insetMapRendering = function(svg, data, args) {
    g = svg.append("g");
    var width = args.canvasW,
        height = args.canvasH;
    var param = args.renderingParams;

    var projection = d3
        .geoAlbers()
        .scale(param.insetMapScale)
        .rotate([71.06, 0])
        .center([0,42.32])
        .translate([width / 2, height / 2]);
    var path = d3.geoPath().projection(projection);

    g.selectAll("path")
        .data(data)
        .enter()
        .append("path")
        .attr("d", function(d) {
            var feature = JSON.parse(d.geometry);
            return path(feature);
        })
        .style("stroke", "#000")
        .style("stroke-width", "3")
        .style("fill", "white");
}

var ridesInRendering = function(svg, data, args) {
    g = svg.append("g");
    var width = args.canvasW,
        height = args.canvasH;
    var param = args.renderingParams;

    g.selectAll("line")
        .data(data)
        .enter()
        .append("line")
        .attr("x1", function (d) {return d.start_bbox_x;})
        .attr("y1", function (d) {return d.start_bbox_y;})
        .attr("x2",  function (d) {return d.end_bbox_x;})
        .attr("y2",  function (d) {return d.end_bbox_y;})
        .style("stroke", "green")
        .style("stroke-width", 1.5)
        .style("opacity",0.2);

    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function (d) {return d.start_bbox_x;})
        .attr("cy", function (d) {return d.start_bbox_y;})
        .attr("r",4)
        .style("opacity",0)
        .on("mouseover", function(d, i) {
            // remove all tool tips first
            d3.select("body")
                .selectAll(".tooltip")
                .remove();
            // create a new tooltip
            var tooltip = d3
                .select("body")
                .append("div")
                .attr("id", "tooltip" + i)
                .classed("tooltip", true)
                .style("position", "absolute")
                .style("width", 300)
                .style("height", 100)
                .style("background","#C4EBC5")
                .style("pointer-events", "none")
                .style("opacity", 1)
                .style("font-size", 24)
                .style("color", "black");
            tooltip
                .transition()
                .duration(200)
                .style("opacity", 0.9);
            tooltip
                .html(d.start_station_name)
                .style("left", d3.event.pageX)
                .style("top", d3.event.pageY);
        })
        .on("mouseout", function(d, i) {
            d3.select("#tooltip" + i).remove();
        });;
}

var ridesOutRendering = function(svg, data, args) {
    g = svg.append("g");
    var width = args.canvasW,
        height = args.canvasH;
    var param = args.renderingParams;

    g.selectAll("line")
        .data(data)
        .enter()
        .append("line")
        .attr("x1", function(d) {return d.start_bbox_x;})
        .attr("y1", function(d) {return d.start_bbox_y;})
        .attr("x2", function(d) {return d.end_bbox_x;})
        .attr("y2", function(d) {return d.end_bbox_y;})
        .style("stroke", "red")
        .style("stroke-width", 1.5)
        .style("opacity",0.2);

    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {return d.end_bbox_x;})
        .attr("cy", function(d) {return d.end_bbox_y;})
        .attr("r",4)
        .style("opacity",0)
        .on("mouseover", function(d, i) {
            // remove all tool tips first
            d3.select("body")
                .selectAll(".tooltip")
                .remove();
            // create a new tooltip
            var tooltip = d3
                .select("body")
                .append("div")
                .attr("id", "tooltip" + i)
                .classed("tooltip", true)
                .style("position", "absolute")
                .style("background", "#EBC4C4")
                .style("width", 300)
                .style("height", 100)
                .style("pointer-events", "none")
                .style("opacity", 1)
                .style("font-size", 24)
                .style("color", "black");
            tooltip
                .transition()
                .duration(200)
                .style("opacity", 0.9);
            tooltip
                .html(d.end_station_name)
                .style("left", d3.event.pageX)
                .style("top", d3.event.pageY);
        })
        .on("mouseout", function(d, i) {
            d3.select("#tooltip" + i).remove();
        });;
}

var stationNameRendering = function(svg, data) {
    g = svg.append("g")
        .append("text")
        .text(function(d) {return "Station Name";})
        .attr("x", 610)
        .attr("y", 50)
        .attr("font-size", 40)
        .attr("fill", "#0059d6");
}

var tableRendering = function(svg, data, args) {
    // create a new g
    var g = svg.append("g");
    var height = args.canvasH;
    var params = args.renderingParams;

    // precompute some stuff
    var headerStartHeight =
        height / 2 -
        ((data.length + 1) * params.cellHeight + params.headerHeight) / 2;
    var firstRowHeight = headerStartHeight + params.headerHeight;
    var fields = [
        "duration",
        "start",
        "end",
        "birth_year",
        "gender"
    ];

    // loop over stats
    var curLeft = params.playerNameCellWidth;
    for (var i = 0; i < fields.length; i++) {
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
    renderingParams, 
    overallMapRendering,
    stationsRendering,
    titleRendering,
    insetMapRendering,
    ridesInRendering,
    ridesOutRendering,
    stationNameRendering,
    tableRendering
};
