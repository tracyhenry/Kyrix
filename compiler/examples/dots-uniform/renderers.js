var dotsRendering = function(svg, data) {
    g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {
            return d.x;
        })
        .attr("cy", function(d) {
            return d.y;
        })
        .attr("r", 10)
        .attr("fill", "#145bce");
};

var dotsAxes = function(args) {
    var cWidth = args.canvasW,
        cHeight = args.canvasH,
        axes = [];
    var styling = function(axesg) {
        axesg
            .selectAll(".tick line")
            .attr("stroke", "#777")
            .attr("stroke-dasharray", "3,10");
        axesg.style("font", "20px arial");
        axesg.selectAll("path").remove();
    };

    //x
    var x = d3
        .scaleLinear()
        .domain([0, 1000000])
        .range([0, cWidth]);
    var xAxis = d3.axisTop().tickSize(-cHeight);
    axes.push({
        dim: "x",
        scale: x,
        axis: xAxis,
        translate: [0, 0],
        styling: styling
    });

    //y
    var y = d3
        .scaleLinear()
        .domain([0, 100000])
        .range([0, cHeight]);
    var yAxis = d3.axisLeft().tickSize(-cWidth);
    axes.push({
        dim: "y",
        scale: y,
        axis: yAxis,
        translate: [0, 0],
        styling: styling
    });
    return axes;
};

module.exports = {
    dotsRendering: dotsRendering,
    dotsAxes: dotsAxes
};
