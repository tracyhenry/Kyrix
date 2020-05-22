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
        .style("fill", "black")
        .style("opacity",0.1);
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
                .style("width", 350)
                .style("height", 50)
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
        .style("fill", "black")
        .style("opacity",0.1);
}

var ridesInRendering = function(svg, data, args) {
    g = svg.append("g");
    var width = args.canvasW,
        height = args.canvasH;
    var param = args.renderingParams;

    var min_count = d3.min(data, d => d.count);
    var max_count = d3.max(data, d => d.count);

    var barWidth = d3.scaleLog()
        .domain([min_count,max_count])
        .range([1,10]);

    g.selectAll("line")
        .data(data)
        .enter()
        .append("line")
        .attr("x1", function (d) {return d.start_bbox_x;})
        .attr("y1", function (d) {return d.start_bbox_y;})
        .attr("x2",  function (d) {return d.end_bbox_x;})
        .attr("y2",  function (d) {return d.end_bbox_y;})
        .style("stroke", "green")
        .style("stroke-width", function (d) {return barWidth(d.count);})
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

    var min_count = d3.min(data, d => d.count)
    var max_count = d3.max(data, d => d.count)

    var barWidth = d3.scaleLog()
        .domain([min_count,max_count])
        .range([1,10]);

    g.selectAll("line")
        .data(data)
        .enter()
        .append("line")
        .attr("x1", function(d) {return d.start_bbox_x;})
        .attr("y1", function(d) {return d.start_bbox_y;})
        .attr("x2", function(d) {return d.end_bbox_x;})
        .attr("y2", function(d) {return d.end_bbox_y;})
        .style("stroke", "red")
        .style("stroke-width", function (d) {return barWidth(d);})
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
        .data(data)
        .append("text")
        .text(function(d) {return d.station;})
        .attr("text-anchor","middle")
        .attr("x", 500)
        .attr("y", 50)
        .attr("font-size", 30)
        .attr("fill", "#0059d6");
}

module.exports = {
    renderingParams, 
    overallMapRendering,
    stationsRendering,
    titleRendering,
    insetMapRendering,
    ridesInRendering,
    ridesOutRendering,
    stationNameRendering
};
