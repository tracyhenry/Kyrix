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

var clusterAxes = function (cWidth, cHeight) {

    var axes = [];

    // x
    var x = d3.scaleLinear()
        .domain([0, 1000])
        .range([0, cWidth]);
    var xAxis = d3.axisTop();
    axes.push({"dim" : "x", "scale" : x, "axis" : xAxis, "translate" : [0, 0]});

    //y
    var y = d3.scaleLinear()
        .domain([0, 1000])
        .range([0, cHeight]);
    var yAxis = d3.axisLeft();
    axes.push({"dim" : "y", "scale" : y, "axis" : yAxis, "translate" : [0, 0]});

    return axes;
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
    var segNum = data.length;
    for (var k = 0; k < channum; k ++) {
        var startingY = k * height / channum;
        for (var i = 0; i < segNum; i++) {
            var oneSeg = [];
            var tofloat = data[i][k + 4].split(",");
            for (var j = 0; j < tofloat.length; j++) {
                if (tofloat[j] > maxV || tofloat[j] < minV)
                    tofloat[j] = 0;
                tofloat[j] *= magnitude;
                oneSeg.push({
                    "x": pixelPerSeg * (+data[i][3]) + j * pixelPerSeg / numPoints,
                    "y": d3.scaleLinear().domain([minV, maxV]).range([0, height / channum])(+tofloat[j]) + startingY});
            }
            dataset.push(oneSeg);
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
    for (var i = 0; i < channum; i ++) {
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
        .attr("y", 800 - 225)
        .attr("width", 450)
        .attr("height", 450)
        .attr("xlink:href", function (d){return "/static/images/" + d[1];});
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
