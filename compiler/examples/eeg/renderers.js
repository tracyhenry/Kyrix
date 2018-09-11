var mainRendering = function (svg, data) {
    data.sort(function (a, b) {
        var aX = +a[1];
        var bX = +b[1];
        if (aX > bX) return 1;
        if (aX < bX) return -1;
        return 0;
    });
    g = svg.append("g");

    var line = d3.line()
        .x(function (d) {
            return d[1]
        })
        .y(function (d) {
            return d[2];
        })

    var dataset = [];
    for (var i = 0; i < 21; i++)
        dataset.push([]);
    for (var i = 0; i < data.length; i ++)
        dataset[+data[i][4]-1].push(data[i]);

    for (var i = 0; i < 21; i++) {

        g.append('path')
            .attr('class', 'line')
            .attr('d', line(dataset[i]))
            .attr('fill', 'none')
            .attr('stroke-width', 1)
            .attr('stroke', 'black');
    }

/*
    xscale = d3.scaleLinear().domain([0,d3.max(dataset[0], function(d){return d[1]})]).range([0,width]);

    g.append('g')
        .attr('class', 'axis')
        .call(d3.axisBottom(xscale))
        .append("text")
        .text("time");
*/

};
/*
var yaxisRendering = function (svg, data) {
    var yscale = d3.scaleLinear().domain([0,21]).range([0, height]);
    g = svg.append("g");
    g.append('g')
        .attr('class','axis')
        .call(d3.axisLeft(yscale))
        .ticks(21)
        .tickFormat(function(d){
            return d[4];
        }
        .append("text")
        .text("channel");
};*/
module.exports = {
    mainRendering : mainRendering,
    yaxisRendering : yaxisRendering
};
