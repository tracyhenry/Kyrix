var nameRendering = function (svg, data) {
    g = svg.append("g");
    /*    g.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", function (d) {return d[1];})
        .attr("y", function (d) {return d[2];})
        .attr("width", 40)
        .attr("height", 10)
        .attr("fill", "#145bce");
      */
    g.selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {return d.coding;})
        .attr("x", function(d) {return d.x;})
        .attr("y", function(d) {return d.y+10;})
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1);

};

var dotsRendering = function (svg, data, args) {
    var chrom_length = [249250621, 243199373, 198022430, 191154276, 180915260, 171115067, 159138663, 146364022, 141213431,
        135534747, 153006516, 133851895, 115169878, 107349540, 102531392, 90354753, 81195210,
        78077248, 59128983, 63025520, 48129895, 51304566, 155270560, 59373566];
    g = svg.append("g");
    var chrom = +0;
    for (var i = 0; i < 22; i ++){
        g.append("line")
            .attr("x1", d3.scaleLinear().domain([0, 3e9]).range([0, args.canvasW])(chrom + chrom_length[i]))
            .attr("y1", 0)
            .attr("x2", d3.scaleLinear().domain([0, 3e9]).range([0, args.canvasW])(chrom + chrom_length[i]))
            .attr("y2", args.canvasH)
            .attr("stroke", "gray")
            .attr("stroke-dasharray", ("3, 3"));
        chrom += chrom_length[i];
    }

    g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function (d) {return d.x;})
        .attr("cy", function (d) {var origin = d3.scaleLinear().domain([0,args.canvasH]).range([args.canvasH,0])(d.y);
            return d3.scaleLinear().domain([0,14]).range([args.canvasH,0])(origin);})
        .attr("r", 3)
        .attr("fill", "#145bce");
};

var typeRendering = function (svg, data) {
    g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function (d) {return d[0];})
        .attr("cy", function (d) {return d[2];})
        .attr("r",3)
        .attr("fill", "red");
};
var axes = function (args) {
    var axes = [];

    // x
    var x = d3.scaleLinear()
        .domain([0, 3e9])
        .range([0, args.canvasW]);
    var xAxis = d3.axisBottom().ticks(5);
    axes.push({"dim" : "x", "scale" : x, "axis" : xAxis, "translate" : [0, args.canvasH]});

    //y
    var y = d3.scaleLinear()
        .domain([0, 14])
        .range([args.canvasH, 0]);
    var yAxis = d3.axisLeft().ticks(7);
    axes.push({"dim" : "y", "scale" : y, "axis" : yAxis, "translate" : [0, 0]});

    return axes;

}
module.exports = {
    nameRendering: nameRendering,
    dotsRendering: dotsRendering,
    typeRendering: typeRendering,
    axes : axes
};