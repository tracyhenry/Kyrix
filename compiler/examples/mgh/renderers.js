var renderingParams = {};

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
        .domain([0, 1000])
        .range([0, cWidth]);
    var xAxis = d3.axisTop().ticks(3);
    axes.push({"dim" : "x", "scale" : x, "axis" : xAxis, "translate" : [0, 0]});

    //y
    var y = d3.scaleLinear()
        .domain([0, 1000])
        .range([0, cHeight]);
    var yAxis = d3.axisLeft().ticks(3);
    axes.push({"dim" : "y", "scale" : y, "axis" : yAxis, "translate" : [0, 0]});

    return axes;
};

var eegRendering = function (svg, data, width, height, params, magnitude, montage) {

    if (typeof magnitude != "number")
        magnitude = 1;

    // create a new g
    var g = svg.append("g");

    // prepare raw data
    var segNum = data.length;
    var numPoints = 400;
    var numChannels = (montage == 1 ? 20 : 22);
    var m2First = [8, 6, 16, 18, -1, 9, 7, 17, 19, -1, 8, 4, 0, 13, -1, 9, 5, 1, 14, -1, 10, 2];
    var m2Second = [6, 16, 18, 11, -1, 7, 17, 19, 12, -1, 4, 0, 13, 11, -1, 5, 1, 14, 12, -1, 2, 15];
    var raw = [];
    for (var i = 0; i < segNum; i ++) {
        var curSeg = [];
        for (var k = 0; k < numChannels; k ++) {
            var curSegChn = [];
            if (montage == 1)
                curSegChn = data[i][k + 4].split(",");
            else if (montage == 2 && m2First[k] < 0)
                curSegChn = Array.apply(null, Array(numPoints)).map(Number.prototype.valueOf, 0);
            else if (montage == 2 && m2First[k] >= 0) {
                var firstArray = data[i][m2First[k] + 4].split(",");
                var secondArray = data[i][m2Second[k] + 4].split(",");
                for (var p = 0; p < numPoints; p ++)
                    curSegChn.push(firstArray[p] - secondArray[p])
            }
            curSeg.push(curSegChn);
        }
        raw.push(curSeg);
    };

    // cook data
    var pixelPerSeg = 200;
    var channelHeight = height / numChannels;
    var channelMargin = 5;
    var minV = -500, maxV = 500;
    var dataset = [];
    for (var k = 0; k < numChannels; k ++) {
        var startingY = k * channelHeight;
        for (var i = 0; i < segNum; i ++) {
            var curSeg = [];
            var curSegChn = [];
            for (var j = 0; j < numPoints; j ++)
                curSegChn.push(+raw[i][k][j]);
            for (var j = 0; j < numPoints; j ++) {
                if (curSegChn[j] > maxV)
                    curSegChn[j] = maxV;
                else if (curSegChn[j] < minV)
                    curSegChn[j] = minV;
                curSegChn[j] *= magnitude;
                curSeg.push({
                    "x": pixelPerSeg * (+data[i][3]) + j * pixelPerSeg / numPoints,
                    "y": d3.scaleLinear().domain([minV, maxV])
                        .range([0, channelHeight - channelMargin])(curSegChn[j]) + startingY
                });
            }
            dataset.push(curSeg);
        }
    }

    // insert background rectangles (for being highlighted)
    g.selectAll('.eegrect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', function (d) {return pixelPerSeg * (d[3]);})
        .attr('y', 0)
        .attr('width', pixelPerSeg)
        .attr('height', height)
        .style('opacity', 0)
        .classed('eegrect', true);

    // d3 line object
    var line = d3.line()
        .x(function (d) {return d.x;})
        .y(function (d) {return d.y;});

    // create
    for (var i = 0; i < numChannels; i ++) {
        if (montage == 2 && m2First[i] < 0)
            continue;
        for (var j = 0; j < segNum; j++) {
            g.append('path')
                .attr('class', 'line')
                .attr('d', line(dataset[j + i * segNum]))
                .attr('fill', 'none')
                .attr('stroke-width', 1)
                .attr('stroke', 'black')
                .node().__data__ = data[j];
        }
    }
};

var eegLabelRendering = function (svg, data, width, height, montage) {

    g = svg.append("g");

    var channel_name;
    var numChannels = (montage == 1 ? 20 : 22);
    if (montage == 1)
        channel_name = ["C3", "C4", "CZ", "EKG", "F3", "F4", "F7", "F8", "FP1",
        "FP2", "FZ", "O1", "O2", "P3", "P4", "PZ", "T3", "T4", "T5", "T6"];
    else
        channel_name = ["Fp1-F7", "F7-T3", "T3-T5", "T5-O1", "", "Fp2-F8", "F8-T4", "T4-T6", "T6-O2", "", "Fp1-F3", "F3-C3", "C3-P3", "P3-O1", "", "Fp2-F4", "F4-C4", "C4-P4", "P4-O2", "", "Fz-Cz", "Cz-Pz"];


    var layerHeight = (height) / numChannels;
    g.selectAll("g")
        .data(channel_name)
        .enter()
        .append("text")
        .attr("font-size", "30px")
        .attr("x", 0)
        .attr("y", function(d, i) {return layerHeight / 2 + i * layerHeight;})
        .text(function(d) {return d;});
};

var eegXAxes = function (cWidth, cHeight, predicates) {

    // get starting date according to data
    var tokens = predicates[1].split("_");
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

var spectrogramRendering = function (svg, data) {

    var g = svg.append("g");

    // schema: image_id, image_url
    g.selectAll("image")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function (d){return d[0] * 450;})
        .attr("y", 0)
        .attr("width", 450)
        .attr("height", 150)
        .attr("transform", "scale(1 3)")
        .attr("xlink:href", function (d){return d[1];});
};

module.exports = {
    renderingParams : renderingParams,
    clusterRendering : clusterRendering,
    clusterAxes : clusterAxes,
    eegRendering : eegRendering,
    eegLabelRendering : eegLabelRendering,
    eegXAxes : eegXAxes,
    spectrogramRendering : spectrogramRendering
};
