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
        var response = JSON.parse(data);
        var renderData = response.renderData;
        var x = response.minx;
        var y = response.miny;
        var tileSvg = d3.select("#a" + x + y + canvasId);
        if (tileSvg == null) // it's possible when the tile data is delayed and this tile is already removed
            return ;

        // draw layers from bottom to top
        for (var i = renderFuncs.length - 1; i >= 0; i --)
            renderFuncs[i](tileSvg, renderData[i]);

        tileSvg.transition()
            .duration(param.tileEnteringDuration)
            .style("opacity", 1.0);

        // register jumps
        registerJumps(tileSvg);

        // apply additional zoom transforms
        if (param.retainSizeZoom &&
            d3.zoomTransform(d3.select("#maing").node()).k > 1)
            tileSvg.selectAll("g")
                .selectAll("*")
                .each(zoomRescale);
    });
};

function RefreshCanvas(viewportX, viewportY) {

    var tileW = globalVar.tileW;
    var tileH = globalVar.tileH;

    // get the current canvas and rendering function
    var renderFuncs = [];
    for (var i = 0; i < globalVar.curCanvas.layers.length; i ++)
        renderFuncs.push(globalVar.curCanvas.layers[i].rendering.parseFunction());

    // get tile ids
    var curViewport = d3.select("#mainSvg").attr("viewBox").split(" ");
    var tileIds = getTileArray(globalVar.curCanvasId,
        viewportX, viewportY, +curViewport[2], +curViewport[3]);

    // render axes
    renderAxes(viewportX, viewportY, +curViewport[2], +curViewport[3]);

    // set viewport, here we only change min-x and min-y of the viewport.
    // Size of the viewport is set either by pageOnLoad(), animateJump() or zoomed()
    // and should not be changed in this function
    var tiles = d3.select("#mainSvg")
        .attr("viewBox", viewportX + " " + viewportY + " "
            + curViewport[2]+ " " + curViewport[3])
        .selectAll("svg")
        .data(tileIds, function (d){return d;});

    // render tiles
    tiles.exit().remove();
    tiles.enter().append("svg")
        .attr("width", tileW)
        .attr("height", tileH)
        .attr("id", function(d) {return "a" + d[0] + d[1] + globalVar.curCanvasId;}) //TODO: add slash-like characters
        .attr("x", function(d) {return d[0];})
        .attr("y", function(d) {return d[1];})
        .attr("viewBox", function (d) {
            return d[0] + " " + d[1] + " " + tileW + " " + tileH;
        })
        .style("opacity", 0)
        .each(function(d) {
            renderTile(this, d[0], d[1], renderFuncs, globalVar.curCanvasId, globalVar.predicates);
        });
    if (param.retainSizeZoom &&
        d3.zoomTransform(d3.select("#maing").node()).k > 1)
        tiles.selectAll("g")
            .selectAll("*")
            .each(zoomRescale);
};
