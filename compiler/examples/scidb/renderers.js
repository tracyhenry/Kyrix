var dotsRendering = function (svg, data, args) {
// chrom
    g = svg.append("g");
    var chrom_length = [249250621, 243199373, 198022430, 191154276, 180915260, 171115067, 159138663, 146364022, 141213431,
        135534747, 153006516, 133851895, 115169878, 107349540, 102531392, 90354753, 81195210,
        78077248, 59128983, 63025520, 48129895, 51304566, 155270560, 59373566];
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
// phenotype dots
    g = svg.append("g");
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function (d) {return d3.scaleLinear().domain([0, 3e9]).range([0, args.canvasW])(d.xpos)})
        .attr("cy", function (d) {return d3.scaleLinear().domain([0, 20]).range([args.canvasH, 0])(d.log10pvalue)})
        .attr("r", 2)
        .attr("fill", "#145bce");

};

var topAxes = function (args) {
    var axes = [];

    // x
    var x = d3.scaleLinear()
        .domain([0, 3e9])
        .range([0, args.canvasW]);
    var xAxis = d3.axisBottom().ticks(5);
    axes.push({"dim" : "x", "scale" : x, "axis" : xAxis, "translate" : [0, 500]});

    //y
    var y = d3.scaleLinear()
        .domain([0, 20])
        .range([args.canvasH, 0]);
    var yAxis = d3.axisLeft().ticks(7);
    axes.push({"dim" : "y", "scale" : y, "axis" : yAxis, "translate" : [0, 0]});

    return axes;

};

var regionAxes = function (args) {
    var axes = [];

    // x
    var x = d3.scaleLinear()
        .domain([0, 2.5e8])
        .range([0, args.canvasW]);
    var xAxis = d3.axisBottom().ticks(5);
    axes.push({"dim" : "x", "scale" : x, "axis" : xAxis, "translate" : [0, 500]});

    //y
    var y = d3.scaleLinear()
        .domain([0, 10])
        .range([args.canvasH, 0]);
    var yAxis = d3.axisLeft().ticks(7);
    axes.push({"dim" : "y", "scale" : y, "axis" : yAxis, "translate" : [0, 0]});

    return axes;

};

var regionRendering = function (svg, data, args) {
    g = svg.append("g");
    console.log(data); 
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function (d) {return d3.scaleLinear().domain([0, 2.5e8]).range([0, args.canvasW])(d.pos)})
        .attr("cy", function (d) {return d3.scaleLinear().domain([0, 10]).range([args.canvasH, 0])(d.log10pvalue)})
        .attr("r", 2)
        .attr("fill", "#145bce");
}

module.exports = {
    dotsRendering: dotsRendering,
    topAxes : topAxes,
    regionAxes : regionAxes,
    regionRendering : regionRendering
};

