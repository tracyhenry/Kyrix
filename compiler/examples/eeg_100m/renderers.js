var renderingParams = {};

var eegRendering = function (svg, data, width, height) {

    // append a new g
    g = svg.append("g");

    // sort based on x
    data.sort(function (a, b) {
        var aX = +a[1];
        var bX = +b[1];
        if (aX > bX) return 1;
        if (aX < bX) return -1;
        return 0;
    });

    // prepare data
    var dataset = [];
    for (var i = 0; i < 20; i++)
        dataset.push([]);
    for (var i = 0; i < data.length; i ++)
        dataset[+data[i][3]].push(data[i]);

    var line = d3.line()
        .x(function (d) {
            return d[1]
        })
        .y(function (d) {
            return d[2];
        });

    for (var i = 0; i < 20; i ++) {
        var curBox = [];
        var minx = miny = 1e10;
        var maxx = maxy = -1e20;
        for (var j = 0; j < dataset[i].length; j ++) {
            var len = dataset[i][j].length;
            minx = Math.min(minx, +dataset[i][j][len - 4]);
            miny = Math.min(miny, +dataset[i][j][len - 3]);
            maxx = Math.max(maxx, +dataset[i][j][len - 2]);
            maxy = Math.max(maxy, +dataset[i][j][len - 1]);
        }
        curBox.push((minx + maxx) / 2);
        curBox.push((miny + maxy) / 2);
        curBox.push(minx);
        curBox.push(miny);
        curBox.push(maxx);
        curBox.push(maxy);
        g.append('path')
            .attr('class', 'line')
            .attr('d', line(dataset[i]))
            .attr('fill', 'none')
            .attr('stroke-width', 1)
            .attr('stroke', 'black')
            .node().__data__ = curBox;
    }
};

var eegLabelRendering = function (svg, data, width, height) {

    g = svg.append("g");

    var numChannels = 20;
    var channel_name = ["C3", "C4", "CZ", "EKG", "F3", "F4", "F7", "F8", "FP1",
        "FP2", "FZ", "O1", "O2", "P3", "P4", "PZ", "T3", "T4", "T5", "T6"];

    var layerHeight = height / numChannels;
    g.selectAll("g")
        .data(channel_name)
        .enter()
        .append("text")
        .attr("font-size", "30px")
        .attr("x", 0)
        .attr("y", function(d, i) {return layerHeight / 2 + i * layerHeight;})
        .text(function(d) {return d;});
};

var eegXAxes = function (cWidth, cHeight) {

    var predicate = "sid1776_20121226_095929";
    // get starting date according to data
    var tokens = predicate.split("_");
    var startDate = new Date(d3.timeParse("%Y%m%d%H%M%S")(tokens[1] + tokens[2]));
    var endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
    var axes = [];
    var x = d3.scaleTime()
        .domain([startDate, endDate])
        .range([0, cWidth]);
    var xAxis = d3.axisTop()
        .tickSize(-cHeight)
        .ticks(d3.timeSecond.filter(function (d) {return (d.getSeconds() - startDate.getSeconds()) % 2 == 0;}))
        .tickFormat(d3.timeFormat("%H:%M:%S"));
    axes.push({"dim": "x", "scale": x, "axis": xAxis, "translate": [0, 0]});

    return axes;
};

module.exports = {
    renderingParams : renderingParams,
    eegRendering : eegRendering,
    eegLabelRendering : eegLabelRendering,
    eegXAxes : eegXAxes
};
