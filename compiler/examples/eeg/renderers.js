var mainRendering = function (svg, data) {
    data.sort(function (a, b) {
        var aX = +a[1];
        var bX = +b[1];
        if (aX > bX) return 1;
        if (aX < bX) return -1;
        return 0;
    });
    g = svg.append("g");
    console.log(data);
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

};

var yaxisRendering = function (svg, data) {
    var channel_name = [];
    for (var i = 0; i< data.length; i++)
        channel_name.push(data[i][0]);

    g = svg.append("g");

    g.selectAll("g")
        .data(channel_name)
        .enter()
        .append("text")
        .attr("font-size", "30px")
        .attr("x", 0)
        .attr("y", function(d,i){return 50+i*100;})
        .text(function(d){return d;});
};

module.exports = {
    mainRendering : mainRendering,
    yaxisRendering : yaxisRendering
};
