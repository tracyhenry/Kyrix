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

function RefreshDynamicLayers(viewportX, viewportY) {

    if (param.fetchingScheme == "tiling") {

        var tileW = globalVar.tileW;
        var tileH = globalVar.tileH;

        // get tile ids
        var curViewport = d3.select(".mainsvg:not(.static)").attr("viewBox").split(" ");
        var tileIds = getTileArray(globalVar.curCanvasId,
            viewportX, viewportY, +curViewport[2], +curViewport[3]);

        // render axes
        renderAxes(viewportX, viewportY, +curViewport[2], +curViewport[3]);

        // set viewport, here we only change min-x and min-y of the viewport.
        // Size of the viewport is set either by pageOnLoad(), animateSemanticZoom() or zoomed()
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
                                curLayer.rendering.parseFunction()(tileSvg, renderData[i],
                                    globalVar.curCanvas.w,
                                    globalVar.curCanvas.h,
                                    JSON.parse(globalVar.renderingParams));

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
    }
    else if (param.fetchingScheme == "dbox") {

        // todo: presumably there should be a request queue to handle concurrent requests
        // get current viewport
        var curViewport = d3.select(".mainsvg:not(.static)").attr("viewBox").split(" ");
        var vpW = +curViewport[2];
        var vpH = +curViewport[3];

        // render axes
        renderAxes(viewportX, viewportY, +curViewport[2], +curViewport[3]);

        d3.selectAll(".mainsvg:not(.static)")
            .attr("viewBox", viewportX + " " + viewportY + " " + vpW + " " + vpH);

        // check if there is pending box requests
        if (globalVar.pendingBoxRequest)
            return ;

        // check if there is literal zooming going on
        if (d3.event != null && d3.event.transform.k != 1)
            return ;

        // get new box
        // send request to backend to get data
        var postData = "id=" + globalVar.curCanvasId + "&"
            + "x=" + (viewportX | 0) + "&"
            + "y=" + (viewportY | 0);
        for (var i = 0; i < globalVar.predicates.length; i ++)
            postData += "&predicate" + i + "=" + globalVar.predicates[i];

        if (! globalVar.hasBox || (viewportX <= globalVar.boxX || (viewportX + vpW) >= (globalVar.boxX + globalVar.boxW)
            || viewportY <= globalVar.boxY || (viewportY + vpH) >= (globalVar.boxY + globalVar.boxH))) {


            globalVar.hasBox = true;
            globalVar.pendingBoxRequest = true;
            $.post("/dbox", postData, function (data) {

                // response data
                var response = JSON.parse(data);
                var renderData = response.renderData;
                var x = response.minx;
                var y = response.miny;
                var canvasId = response.canvasId;

                // check if this response is already outdated
                if (canvasId != globalVar.curCanvasId) {
                    globalVar.pendingBoxRequest = false;
                    return ;
                }

                // modify global var
                globalVar.boxH = response.boxH;
                globalVar.boxW = response.boxW;
                globalVar.boxX = x;
                globalVar.boxY = y;
                globalVar.renderData = renderData;

                var numLayers = globalVar.curCanvas.layers.length;
                // loop over every layer to render
                for (var i = numLayers - 1; i >= 0; i --) {

                    // current layer object
                    var curLayer = globalVar.curCanvas.layers[i];

                    // if this layer is static, return
                    if (curLayer.isStatic)
                        continue;

                    // current box svg
                    var dboxSvg = d3.select(".layerg.layer" + i)
                        .select(".mainsvg");

                    dboxSvg.selectAll("*").remove();
                    // draw current layer
                    curLayer.rendering.parseFunction()(dboxSvg, renderData[i],
                        globalVar.curCanvas.w,
                        globalVar.curCanvas.h,
                        JSON.parse(globalVar.renderingParams));

                    // register jumps
                    if (!globalVar.animation)
                        registerJumps(dboxSvg, +i);

                    // apply additional zoom transforms
                    if (param.retainSizeZoom &&
                        d3.zoomTransform(d3.select("#maing").node()).k > 1)
                        dboxSvg.selectAll("g")
                            .selectAll("*")
                            .each(zoomRescale);
                }
                globalVar.pendingBoxRequest = false;
            });
        }
    }
    if (param.retainSizeZoom &&
        d3.zoomTransform(d3.select("#maing").node()).k > 1)
        tiles.selectAll("g")
            .selectAll("*")
            .each(zoomRescale);
};
