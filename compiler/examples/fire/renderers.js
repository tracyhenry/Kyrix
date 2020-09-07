var renderingParams = {
    fire_year: 2000,
    stateMapScale: 2000,
    stateScaleRange: 300000,
    stateScaleStep: 40000
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
    g = svg.append("g");
    var width = args.canvasW,
        height = args.canvasH;
    var params = args.renderingParams;

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
    var colors = ["#374e99", "#996237", "#999237", "#8e3799"];
    var maxArea = d3.max(geomStrs.map(d => path.area(d)));
    for (var i = 0; i < allStates.length; i++) {
        // use geomstr to calculate cx, cy
        var cx = path.centroid(geomStrs[i])[0];
        var cy = path.centroid(geomStrs[i])[1];
        var bounds = path.bounds(geomStrs[i]);

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
    stateMapRendering,
    barRendering,
    renderingParams
};
