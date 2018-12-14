var renderingParams = {};

var eegRendering = function (svg, data, width, height) {

    // create a new g
    var g = svg.append("g");

    // prepare data
    var segNum = data.length;
    var numPoints = 400;
    var numChannels = 20;
    var pixelPerSeg = data[0][1];
    var channelHeight = height / numChannels;
    var channelMargin = 5;
    var minV = -500, maxV = 500;
    var dataset = [];
    for (var k = 0; k < numChannels; k ++) {
        var startingY = k * channelHeight;
        for (var i = 0; i < segNum; i ++) {
            var curSeg = [];
            var curSegChn = data[i][k + 3].split(",");
            for (var j = 0; j < numPoints; j ++) {
                curSegChn[j] = +curSegChn[j];
                if (curSegChn[j] > maxV)
                    curSegChn[j] = maxV;
                else if (curSegChn[j] < minV)
                    curSegChn[j] = minV;
                curSeg.push({
                    "x": pixelPerSeg * (+data[i][0]) + j * pixelPerSeg / numPoints,
                    "y": d3.scaleLinear().domain([minV, maxV])
                        .range([0, channelHeight - channelMargin])(curSegChn[j]) + startingY
                });
            }
            dataset.push(curSeg);
        }
    }

    // d3 line object
    var line = d3.line()
        .x(function (d) {return d.x;})
        .y(function (d) {return d.y;});

    // create
    for (var i = 0; i < numChannels; i ++)
        for (var j = 0; j < segNum; j ++)
            g.append('path')
                .attr('class', 'line')
                .attr('d', line(dataset[j + i * segNum]))
                .attr('fill', 'none')
                .attr('stroke-width', 1)
                .attr('stroke', 'black');
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
