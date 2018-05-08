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
        });
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
        .domain([0, 20000])
        .range([0, cHeight]);
    var yAxis = d3.axisLeft();
    axes.push({"dim" : "y", "scale" : y, "axis" : yAxis, "translate" : [0, 0]});

    return axes;
};

var scPlotStaticTrim = function(g) {
    g.append("text")
        .text("Let's go Celtics!")
        .attr("x", 400)
        .attr("y", 400)
        .attr("dy", ".35em")
        .attr("font-size", 50)
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1);
};

module.exports = {
    scPlotRendering : scPlotRendering,
    scPlotAxes : scPlotAxes,
    scPlotStaticTrim : scPlotStaticTrim
};
