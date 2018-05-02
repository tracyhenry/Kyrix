var scPlotRendering = function render(svg, data) {
    var g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {return d[1];})
        .attr("cy", function(d) {return d[2];})
        .attr("r", 13)
        .style("stroke", "#CCC")
        .style("fill", function (d){
            var colors = ["orange", "red", "blue", "green", "purple"];
            return colors[d[3]];
        })
        .attr("data-tuple", function(d) {return d;});
};

var scPlotAxes = function (cWidth, cHeight) {

    var axes = [];

    // x
    var x = d3.scaleLinear()
        .domain([0, 100000])
        .range([0, cWidth]);
    var xAxis = d3.axisTop();
    axes.push({"dim" : "x", "scale" : x, "axis" : xAxis, "translate" : [0, 0]});

    //y
    var y = d3.scaleLinear()
        .domain([0, 100000])
        .range([0, cHeight]);
    var yAxis = d3.axisLeft();
    axes.push({"dim" : "y", "scale" : y, "axis" : yAxis, "translate" : [0, 0]});

    return axes;
};

module.exports = {
    scPlotRendering : scPlotRendering,
    scPlotAxes : scPlotAxes
};
