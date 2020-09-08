var renderingParams = {
    fire_year: 2000,
    stateMapScale: 2000,
    stateScaleRange: 300000,
    stateScaleStep: 40000,
    showBarchart: true
};

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

var stateMapLegendRendering = function(svg, data, args) {
    // parameters
    var bkgRectWidth = 600;
    var bkgRectXOffset = 200;
    var legendRectStartXOffset = bkgRectWidth + bkgRectXOffset - 60;
    var legendRectY = 32;
    var legendRectWidth = 60;
    var legendRectHeight = 16;
    var captionY = 20;
    var captionFontSize = 22;
    var tickFontSize = 12;

    var g = svg.append("g");
    var width = args.viewportW;
    var param = args.renderingParams;

    // rectangles representing colors
    var color = d3
        .scaleThreshold()
        .domain(d3.range(0, param.stateScaleRange, param.stateScaleStep))
        .range("colorScheme" in args ? args.colorScheme : d3.schemeYlOrRd[9]);
    g.selectAll(".legendrect")
        .data(color.range().slice(1))
        .enter()
        .append("rect")
        .attr("x", function(d, i) {
            return width - legendRectStartXOffset + i * legendRectWidth;
        })
        .attr("y", legendRectY)
        .attr("width", legendRectWidth)
        .attr("height", legendRectHeight)
        .attr("fill", function(d) {
            return d;
        });

    // caption text
    g.append("text")
        .attr("x", width - legendRectStartXOffset) //width - bkgRectWidth - bkgRectXOffset)
        .attr("y", captionY)
        .attr("fill", "#000")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .attr("font-size", captionFontSize)
        .text("Acres of land burned");

    // axis ticks
    var axisScale = d3
        .scaleLinear()
        .domain([0, 320000])
        .rangeRound([
            width - legendRectStartXOffset,
            width - legendRectStartXOffset + 8 * legendRectWidth
        ]);
    var axis = g
        .append("g")
        .attr("transform", "translate(0, " + legendRectY + ")")
        .call(
            d3
                .axisBottom(axisScale)
                .tickSize(23)
                .tickValues(color.domain())
        );
    axis.style("font-size", tickFontSize);
    axis.select(".domain").remove();

    // bar chart legends
    if (param.showBarchart) {
        var causes = ["Debris Burning", "Arson", "Lightning", "Equipment Use"];
        //var colors = ["#374e99", "#996237", "#999237", "#8e3799"];
        //var colors = ["#90D7FF", "#98CE00", "#4B644A", "#9C7CA5"];
        var colors = ["#4026bf", "#a6bf26", "#26bf40", "#bf26a6"];

        var color = d3.scaleOrdinal(colors).domain(causes);
        var legendOrdinal = d3
            .legendColor()
            .shape("rect")
            .orient("horizontal")
            .shapePadding(100)
            .labelOffset(15)
            //.titleWidth(200)
            // .labelAlign("start")
            .scale(color);

        svg.append("g")
            .attr("transform", "translate(660 0)")
            .attr("font-size", "22px")
            .attr("font-weight", "normal")
            .call(legendOrdinal);
    }
};

var stateMapRendering = function(svg, data, args) {
    g = svg.append("g");
    var width = args.canvasW,
        height = args.canvasH;
    var params = args.renderingParams;

    var projection = d3
        .geoAlbersUsa()
        .scale(params.stateMapScale)
        .translate([width / 2, height / 2]);
    var path = d3.geoPath().projection(projection);

    var color = d3
        .scaleThreshold()
        .domain(d3.range(0, params.stateScaleRange, params.stateScaleStep))
        .range(d3.schemeYlOrRd[9]);

    var allStates = [];
    var geomStrs = {};
    for (var i = 0; i < data.length; i++) {
        if (!allStates.includes(data[i].state) && data[i].geomstr.length > 0) {
            allStates.push(data[i].state);
            geomStrs[data[i].state] = data[i].geomstr;
        }
    }
    var filteredData = [];
    for (var i = 0; i < allStates.length; i++)
        for (var j = 0; j < data.length; j++) {
            if (
                data[j].year == params.fire_year &&
                data[j].state == allStates[i]
            ) {
                data[j].geomstr = geomStrs[data[j].state];
                filteredData.push(data[j]);
            }
        }

    g.selectAll("path")
        .data(filteredData)
        .enter()
        .append("path")
        .attr("d", function(d) {
            var feature = JSON.parse(d.geomstr);
            return path(feature);
        })
        .style("stroke", "#fff")
        .style("stroke-width", "0.5")
        .style("fill", function(d) {
            return color(+d.total_fire_size);
        });
};

var barRendering = function(svg, data, args) {
    var params = args.renderingParams;
    if (!params.showBarchart) return;
    var width = args.canvasW,
        height = args.canvasH;
    g = svg.append("g");

    var projection = d3
        .geoAlbersUsa()
        .scale(params.stateMapScale)
        .translate([width / 2, height / 2]);
    var path = d3.geoPath().projection(projection);

    var allStates = [];
    var geomStrs = [];
    for (var i = 0; i < data.length; i++) {
        if (!allStates.includes(data[i].state) && data[i].geomstr.length > 0) {
            allStates.push(data[i].state);
            geomStrs.push(JSON.parse(data[i].geomstr));
        }
    }

    var causes = ["Debris Burning", "Arson", "Lightning", "Equipment Use"];
    //var colors = ["#e374c3", "#c3e374", "#74e3b5", "#e38474"];
    //var colors = ["#374e99", "#996237", "#999237", "#8e3799"];
    //var colors = ["#90D7FF", "#98CE00", "#4B644A", "#9C7CA5"];
    var colors = ["#4026bf", "#a6bf26", "#26bf40", "#bf26a6"];
    for (var i = 0; i < allStates.length; i++) {
        // use geomstr to calculate cx, cy
        var cx = path.centroid(geomStrs[i])[0];
        var cy = path.centroid(geomStrs[i])[1];
        var bounds = path.bounds(geomStrs[i]);
        if (allStates[i] == "MI") (cx += 30), (cy += 30);

        // get values for the 4 causes
        var cause_map = {};
        var maxFireSize = 0;
        for (var j = 0; j < data.length; j++) {
            if (
                data[j].state == allStates[i] &&
                data[j].fire_year == params.fire_year &&
                causes.includes(data[j].stat_cause_descr)
            ) {
                cause_map[data[j].stat_cause_descr] = data[j].total_fire_size;
                maxFireSize = Math.max(maxFireSize, data[j].total_fire_size);
            }
        }

        if (maxFireSize == 0) continue;

        // add 4 rectangles
        // var barWidth = 300 * area / maxArea;
        // var barHeight = 200 * area / maxArea;
        var barWidth = (bounds[1][0] - bounds[0][0]) * 0.3;
        var barHeight = (bounds[1][1] - bounds[0][1]) * 0.3;
        for (var j = 0; j < causes.length; j++)
            g.append("rect")
                .attr("fill", colors[j])
                .attr("x", cx - barWidth / 2 + (j * barWidth) / 4)
                .attr(
                    "y",
                    cy +
                        barHeight / 2 -
                        (cause_map[causes[j]] / maxFireSize) * barHeight
                )
                .attr("width", barWidth / 4)
                .attr(
                    "height",
                    (cause_map[causes[j]] / maxFireSize) * barHeight
                );
    }
};
module.exports = {
    fireRendering,
    stateMapLegendRendering,
    stateMapRendering,
    barRendering,
    renderingParams
};
