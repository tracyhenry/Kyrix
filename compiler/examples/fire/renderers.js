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
    console.log(params);

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
    for (var i = 0; i < allStates.length; i++) {
        var hasData = false;
        for (var j = 0; j < data.length; j++) {
            if (
                data[j].year == params.fire_year &&
                data[j].state == allStates[i]
            ) {
                data[j].geomstr = geomStrs[data[j].state];
                filteredData.push(data[j]);
                hasData = true;
            }
        }
        if (!hasData) {
            filteredData.push({
                state: allStates[i],
                year: params.fire_year,
                total_fire_size: 0,
                geomstr: geomStrs[allStates[i]]
            });
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

module.exports = {
    fireRendering,
    stateMapRendering,
    renderingParams
};
