var clusterRendering = function (svg, data) {
    var g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {return d[1];})
        .attr("cy", function(d) {return d[2];})
        .attr("r", 10)
        .style("fill", function (d){
            var colors = {"LPD":"orange", "GPD":"red", "GRDA":"blue", "Others":"green", "LRDA":"purple", "Seizure":"black"};
            return colors[d[3]];
        });
};

var clusterAxes = function (cWidth, cHeight) {

    var axes = [];

    // x
    var x = d3.scaleLinear()
        .domain([0, cWidth])
        .range([0, cWidth]);
    var xAxis = d3.axisTop().ticks(3);
    axes.push({"dim" : "x", "scale" : x, "axis" : xAxis, "translate" : [0, 0]});

    //y
    var y = d3.scaleLinear()
        .domain([0, cHeight])
        .range([0, cHeight]);
    var yAxis = d3.axisLeft().ticks(3);
    axes.push({"dim" : "y", "scale" : y, "axis" : yAxis, "translate" : [0, 0]});

    return axes;
};

module.exports = {
    clusterRendering : clusterRendering,
    clusterAxes : clusterAxes
};
