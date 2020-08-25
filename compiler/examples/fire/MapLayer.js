// libraries
const Layer = require("../../src/Layer").Layer;
const defaultEmptyTransform = require("../../src/Transform")
    .defaultEmptyTransform;

const rendering = function(svg, data, args) {
    // from console in original.html
    var deltaX = 895;
    var deltaY = 2616;
    var baselZoomLevel = 4;
    var vx = args["viewportX"];
    var vy = args["viewportY"];
    var vw = args["viewportW"];
    var vh = args["viewportH"];
    var level = args["pyramidLevel"];
    var raster = svg.selectAll("g");
    if (raster.size() == 0) raster = svg.append("g");

    // tile ranges
    var tiles = [];
    // note: vw/3 because dynamic boxes fetch a box slightly larger than viewport
    var minTileX = Math.floor((vx - vw / 3 + (1 << level) * deltaX) / 256);
    var maxTileX = Math.floor((vx + vw + vw / 3 + (1 << level) * deltaX) / 256);
    var minTileY = Math.floor((vy - vh / 3 + (1 << level) * deltaY) / 256);
    var maxTileY = Math.floor((vy + vh + vh / 3 + (1 << level) * deltaY) / 256);
    for (var i = minTileX; i <= maxTileX; i++)
        for (var j = minTileY; j <= maxTileY; j++)
            tiles.push([i, j, 5 + level]);

    var image = raster.selectAll("image").data(tiles, function(d) {
        return d;
    });
    image.exit().remove();

    image
        .enter()
        .append("image")
        .attr("xlink:href", function(d) {
            return (
                "http://" +
                "abcd"[(d[0] + d[1]) % 4] +
                ".tile.stamen.com/terrain/" +
                d[2] +
                "/" +
                d[0] +
                "/" +
                d[1] +
                ".png"
            );
        })
        .attr("x", function(d) {
            return d[0] * 256 - deltaX * (1 << level);
        })
        .attr("y", function(d) {
            return d[1] * 256 - deltaY * (1 << level);
        })
        .attr("width", 256)
        .attr("height", 256);
};

var mapLayer = new Layer(defaultEmptyTransform, false);
mapLayer.addRenderingFunc(rendering);
mapLayer.addPlacement({
    centroid_x: "con:0",
    centroid_y: "con:0",
    width: "con:0",
    height: "con:0"
});
mapLayer.setFetchingScheme("dbox", false);

module.exports = {
    mapLayer
};
