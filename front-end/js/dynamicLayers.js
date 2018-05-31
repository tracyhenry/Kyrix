// render axes
function renderAxes(viewportX, viewportY, vWidth, vHeight) {

    var axesg = d3.select("#axesg");
    axesg.selectAll("*").remove();

    // run axes function
    var axesFunc = globalVar.curCanvas.axes;
    if (axesFunc == "")
        return ;

    var axes = axesFunc.parseFunction()(globalVar.curCanvas.w, globalVar.curCanvas.h);
    for (var i = 0; i < axes.length; i ++) {
        // create g element
        var curg = axesg.append("g")
            .classed("axis", true)
            .attr("id", "axes" + i)
            .attr("transform", "translate("
                + axes[i].translate[0]
                + ","
                + axes[i].translate[1]
                + ")");

        // construct a scale function according to current viewport
        var newScale = axes[i].scale.copy();
        var newRange = [];
        if (axes[i].dim == "x") {
            newRange.push(viewportX), newRange.push(viewportX + vWidth);
            newScale.range([0, globalVar.viewportWidth]);
        }
        else {
            newRange.push(viewportY), newRange.push(viewportY + vHeight);
            newScale.range([0, globalVar.viewportHeight]);
        }
        newScale.domain(newRange.map(axes[i].scale.invert));

        // call axis function
        curg.call(axes[i].axis.scale(newScale));
    }
};

// get an array of tile ids based on the current viewport location
function getTileArray(canvasId, vX, vY, vWidth, vHeight) {

    var tileW = globalVar.tileW;
    var tileH = globalVar.tileH;
    var w = globalVar.curCanvas.w;
    var h = globalVar.curCanvas.h;

    // calculate the tile range that the viewport spans
    var xStart = Math.max(0, Math.floor(vX / tileW) - param.extraTiles);
    var yStart = Math.max(0, Math.floor(vY / tileH) - param.extraTiles);
    var xEnd = Math.min(Math.floor(w / tileW), Math.floor((vX + vWidth) / tileW) + param.extraTiles);
    var yEnd = Math.min(Math.floor(h / tileH), Math.floor((vY + vHeight) / tileH) + param.extraTiles);

    var tileIds = [];
    for (var i = xStart; i <= xEnd; i ++)
        for (var j = yStart; j <= yEnd; j ++)
            tileIds.push([i * tileW, j * tileH, canvasId]);

    return tileIds;
};

// Setup a tile, 1) send a tile request; 2) call renderer; 3) register jumps
// tileSvg is the svg corresponding to a tile
// i and j are tile coordinates
function renderTile(tileSvg, x, y, renderFuncs, canvasId, predicates) {

    // send request to backend to get render func and data
    var postData = "id=" + canvasId + "&"
        + "x=" + x + "&"
        + "y=" + y;
    for (var i = 0; i < predicates.length; i ++)
        postData += "&predicate" + i + "=" + predicates[i];
    $.post("/tile", postData, function (data, status) {
    });
};

function RefreshDynamicLayers(viewportX, viewportY) {

    var tileW = globalVar.tileW;
    var tileH = globalVar.tileH;

    // get tile ids
    var curViewport = d3.select(".mainsvg:not(.static)").attr("viewBox").split(" ");
    var tileIds = getTileArray(globalVar.curCanvasId,
        viewportX, viewportY, +curViewport[2], +curViewport[3]);

    // render axes
    renderAxes(viewportX, viewportY, +curViewport[2], +curViewport[3]);

    // set viewport, here we only change min-x and min-y of the viewport.
    // Size of the viewport is set either by pageOnLoad(), animateJump() or zoomed()
    // and should not be changed in this function
    d3.selectAll(".mainsvg:not(.static)")
        .attr("viewBox", viewportX + " " + viewportY + " "
            + curViewport[2]+ " " + curViewport[3])
        .each(function () { // remove invisible tiles
            var tiles = d3.select(this)
                .selectAll("svg")
                .data(tileIds, function (d){return d;});
            tiles.exit().remove();
        });

    // get new tiles
    d3.select(".mainsvg:not(.static)")
        .each(function () {

            d3.select(this).selectAll("svg")
                .data(tileIds, function (d) {return d;})
                .enter()
                .each(function (d) {
                    // append tile svgs
                    d3.selectAll(".mainsvg:not(.static)")
                        .append("svg")
                        .attr("width", tileW)
                        .attr("height", tileH)
                        .datum(d)
                        .attr("x", d[0])
                        .attr("y", d[1])
                        .attr("viewBox", d[0] + " " + d[1] + " " + tileW + " " + tileH)
                        .style("opacity", 0)
                        .classed("a" + d[0] + d[1] + globalVar.curCanvasId, true)
                        .classed("lowestsvg", true);

                    // send request to backend to get data
                    var postData = "id=" + globalVar.curCanvasId + "&"
                        + "x=" + d[0] + "&"
                        + "y=" + d[1];
                    for (var i = 0; i < globalVar.predicates.length; i ++)
                        postData += "&predicate" + i + "=" + globalVar.predicates[i];
                    $.post("/tile", postData, function (data, status) {

                        // response data
                        var response = JSON.parse(data);
                        var renderData = response.renderData;
                        var x = response.minx;
                        var y = response.miny;

                        // number of layers
                        var numLayers = globalVar.curCanvas.layers.length;

                        // loop over every layer
                        for (var i = numLayers - 1; i >= 0; i--) {

                            // current layer object
                            var curLayer = globalVar.curCanvas.layers[i];

                            // if this layer is static, return
                            if (curLayer.isStatic)
                                continue;

                            // current tile svg
                            var tileSvg = d3.select(".layerg.layer" + i)
                                .select(".mainsvg")
                                .select(".a" + x + y + globalVar.curCanvasId);

                            // it's possible when the tile data is delayed
                            // and this tile is already removed
                            if (tileSvg == null)
                                return;

                            // draw current layer
                            curLayer.rendering.parseFunction()(tileSvg, renderData[i]);

                            tileSvg.transition()
                                .duration(param.tileEnteringDuration)
                                .style("opacity", 1.0);

                            // register jumps
                            if (!globalVar.animation)
                                registerJumps(tileSvg, +i);

                            // apply additional zoom transforms
                            if (param.retainSizeZoom &&
                                d3.zoomTransform(d3.select("#maing").node()).k > 1)
                                tileSvg.selectAll("g")
                                    .selectAll("*")
                                    .each(zoomRescale);
                        }
                    });
                });
        });

    if (param.retainSizeZoom &&
        d3.zoomTransform(d3.select("#maing").node()).k > 1)
        tiles.selectAll("g")
            .selectAll("*")
            .each(zoomRescale);
};
