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

var eegRendering = function (svg, data, width, height) {

    var channum = 20;
    // create a new g
    var g = svg.append("g");

    var pixelPerSeg = 400;
    var numPoints = 400;
    var minV = -500, maxV = 500;
    var dataset = [];
    for (var k = 0; k < channum; k++) {
        var coordinates = [];
        var startingY = k * height / channum;
        for (var i = 0; i < data.length; i++) {
            var tofloat = data[i][k+4].split(",");
            for (var j = 0; j < tofloat.length; j++) {
                if (tofloat[j] > maxV || tofloat[j] < minV)
                    tofloat[j] = 0;
                coordinates.push({"x": pixelPerSeg * (+data[i][3]) + j * pixelPerSeg / numPoints ,
                    "y": d3.scaleLinear().domain([minV, maxV]).range([0, height / channum])(+tofloat[j]) + startingY});
            }
        }
        dataset.push(coordinates);
    }

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

    var channel_name = ["c3", "c4", "cz", "ekg", "f3", "f4", "f7", "f8", "fp1",
        "fp2", "fz", "o1", "o2", "p3", "p4", "pz", "t3", "t4", "t5", "t6"];

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
        .tickFormat(d3.timeFormat("%Y-%m-%d %H:%M:%S"));
    axes.push({"dim": "x", "scale": x, "axis": xAxis, "translate": [0, 0]});

    return axes;
};

module.exports = {
    renderingParams : renderingParams,
    eegRendering : eegRendering,
    eegLabelRendering : eegLabelRendering,
    eegXAxes : eegXAxes,
    clusterRendering : clusterRendering
};
