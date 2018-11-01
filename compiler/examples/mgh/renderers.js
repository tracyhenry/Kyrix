var renderingParams = {};

var clusterRendering = function (svg, data) {
   var g = svg.append("g");
   g.selectAll("circle")
       .data(data)
       .enter()
       .append("circle")
       .attr("cx", function(d) {return d[1];})
       .attr("cy", function(d) {return d[2];})
       .attr("r", 5)
       .style("fill", function (d){
           var colors = {"LPD":"orange", "GPD":"red", "GRDA":"blue", "Other":"green", "LRDA":"purple", "Seizure":"black"};
           return colors[d[3]];
       });
};

var eegRendering = function (svg, data, width, height, params, magnitude) {

    if (typeof magnitude != "number")
        magnitude = 1;
    var channum = 20;

    // create a new g
    var g = svg.append("g");

    var pixelPerSeg = 200;
    var numPoints = 400;
    var minV = -100, maxV = 100;
    var dataset = [];
    for (var k = 0; k < channum; k ++) {
        var coordinates = [];
        var startingY = k * height / channum;
        for (var i = 0; i < data.length; i++) {
            var tofloat = data[i][k+4].split(",");
            for (var j = 0; j < tofloat.length; j ++) {
                if (tofloat[j] > maxV || tofloat[j] < minV)
                    tofloat[j] = 0;
                tofloat[j] *= magnitude;
                coordinates.push({"x": pixelPerSeg * (+data[i][3]) + j * pixelPerSeg / numPoints ,
                    "y": d3.scaleLinear().domain([minV, maxV]).range([0, height / channum])(+tofloat[j]) + startingY});
            }
        }
        dataset.push(coordinates);
    }

    // insert background rectangles (for being highlighted)
    g.selectAll('.eegrect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', function (d) {return pixelPerSeg * (+d[3]);})
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
    for (var i = 0; i < channum; i ++) {
        g.append('path')
            .attr('class', 'line')
            .attr('d', line(dataset[i]))
            .attr('fill', 'none')
            .attr('stroke-width', 1)
            .attr('stroke', 'black');
    }
};

var eegLabelRendering = function (svg, data, width, height) {

    g = svg.append("g");
    var channel_name = ["C3", "C4", "CZ", "EKG", "F3", "F4", "F7", "F8", "FP1",
        "FP2", "FZ", "O1", "O2", "P3", "P4", "PZ", "T3", "T4", "T5", "T6"];

    var layerHeight = height / 20;
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
        //.tickFormat(d3.timeFormat("%Y-%m-%d %H:%M:%S"));
        .tickFormat(d3.timeFormat("%H:%M:%S"));
    axes.push({"dim": "x", "scale": x, "axis": xAxis, "translate": [0, 0]});

    return axes;
};

var spectrumRendering = function (svg, data) {

    var ScaleRange = 30;
    var ScaleStep = 6;
    var pxPerSeg = 1;
    var heightPerpx = 10;
    var color = d3.scaleThreshold()
        .domain(d3.range(-30, ScaleRange, ScaleStep))
        .range(d3.schemeRdYlBu[11]);

    var y = [0.78125, 1.171875, 1.5625, 1.953125, 2.34375, 2.734375, 3.125
        , 3.515625, 3.90625, 4.296875, 4.6875, 5.078125, 5.46875, 5.859375
        , 6.25, 6.640625, 7.03125, 7.421875, 7.8125, 8.203125, 8.59375
        , 8.984375, 9.375, 9.765625, 10.15625, 10.546875, 10.9375, 11.328125
        , 11.71875, 12.109375, 12.5, 12.890625, 13.28125, 13.671875, 14.0625
        , 14.453125, 14.84375, 15.234375, 15.625, 16.015625, 16.40625, 16.796875
        , 17.1875, 17.578125, 17.96875, 18.359375, 18.75, 19.140625, 19.53125
        , 19.921875];

    //data[[pid1,time1,time2,sid,"ll","lp","rl","rp"][pid2...pid1600]]
    var val = [];
    for (var j = 4; j < 8; j++) {
        var temp = [];
        for (var i = 0; i < data.length; i++) {
            var toFloat = data[i][j].split(",");
            temp.push(toFloat);
        }
        val.push(temp);
    }

    var g = svg.append("g");
    //val[[[ll of sid1],[ll of sid2],[ll]],[[lp of sid1],[]]]
    for (var k = 0; k < 4; k++) {
        for (var j = 0; j < data.length; j++) {
            g.selectAll('.seg' + k.toString() + '_' + j.toString())
                .data(val[k][j])
                .enter()
                .append("rect")
                .attr("x", data[j][3] * pxPerSeg)
                .attr("y", function (d, i) {
                    return y[i] * heightPerpx + k * 300;
                })
                .attr("width", pxPerSeg)
                .attr("height", heightPerpx)
                .style("fill", function (d) {
                    return color(10 * Math.log10(d))
                });
        }
    }
};

var spectrumLabelRendering = function (svg, data) {
    var g = svg.append("g");
};

module.exports = {
    renderingParams : renderingParams,
    eegRendering : eegRendering,
    eegLabelRendering : eegLabelRendering,
    eegXAxes : eegXAxes,
    clusterRendering : clusterRendering,
    spectrumRendering : spectrumRendering,
    spectrumLabelRendering : spectrumLabelRendering
};
