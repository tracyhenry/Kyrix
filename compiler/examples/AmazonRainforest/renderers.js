var renderingParams = {
    "rownumber" : [1, 1],
    "colnumber" : [1, 1],
    "blockwidth" : [2548, 10080],
    "blockheight" : [976, 3860]
};

var backgroundRendering = function (svg, data, width, height, params) {
    g = svg.append("g");
    g.selectAll("image")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function (d) {return d[1] - params.blockwidth[d[3]-1]/2;})
        .attr("y", function (d) {return d[2] - params.blockheight[d[3]-1]/2;})
        .attr("width", function (d) {return params.blockwidth[d[3]-1];})
        .attr("height", function (d) {return params.blockheight[d[3]-1];})
        .attr("xlink:href", function (d) {return "https://farm" + d[4] + ".staticflickr.com/" + d[5] + "_o.jpg";});
};

module.exports = {
    renderingParams : renderingParams,
    backgroundRendering : backgroundRendering
};
