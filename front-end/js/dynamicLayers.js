// render axes
function renderAxes(viewportX, viewportY, vWidth, vHeight) {

    var axesg = d3.select("#axesg");
    axesg.selectAll("*").remove();

    // run axes function
    var axesFunc = globalVar.curCanvas.axes;
    if (axesFunc == "")
        return ;

    var axes = axesFunc.parseFunction()(getOptionalArgs());
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

    // current viewport
    viewportX = +viewportX;
    viewportY = +viewportY;
    var vpW, vpH;
    if (d3.select(".mainsvg:not(.static)").size() == 0)
        vpW = globalVar.viewportWidth, vpH = globalVar.viewportHeight;
    else {
        var curViewport = d3.select(".mainsvg:not(.static)").attr("viewBox").split(" ");
        vpW = +curViewport[2];
        vpH = +curViewport[3];
    }

    // render axes
    renderAxes(viewportX, viewportY, vpW, vpH);

    // no dynamic layers? return
    if (d3.select(".mainsvg:not(.static)").size() == 0)
        return ;

    // optional rendering args
    var optionalArgs = getOptionalArgs();
    optionalArgs["viewportX"] = viewportX;
    optionalArgs["viewportY"] = viewportY;

    if (param.fetchingScheme == "tiling") {

        var tileW = globalVar.tileW;
        var tileH = globalVar.tileH;

        // get tile ids
        var tileIds = getTileArray(globalVar.curCanvasId,
            viewportX, viewportY, vpW, vpH);

        // set viewport, here we only change min-x and min-y of the viewport.
        // Size of the viewport is set either by pageOnLoad(), animateSemanticZoom() or zoomed()
        // and should not be changed in this function
        d3.selectAll(".mainsvg:not(.static)")
            .attr("viewBox", viewportX + " " + viewportY + " "
                + vpW + " " + vpH)
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
                            postData += "&predicate" + i + "=" + getSqlPredicate(globalVar.predicates[i]);
                        $.post("/tile", postData, function (data, status) {

                            // response data
                            var response = JSON.parse(data);
                            var x = response.minx;
                            var y = response.miny;

                            // remove tuples outside the viewport
                            // doing this because some backend indexers use compression
                            // and may return tuples outside viewport
                            // doing this in the backend is not efficient, so we do it here
                            var renderData = response.renderData;
                            var numLayers = globalVar.curCanvas.layers.length;
                            for (var i = 0; i < numLayers; i ++)
                                renderData[i] = renderData[i].filter(function (d) {
                                        if (+d.maxx < x || +d.minx > (x + globalVar.tileW)
                                            || +d.maxy < y || +d.miny > (y + globalVar.tileH))
                                            return false;
                                        return true;});

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
                                curLayer.rendering.parseFunction()(tileSvg, renderData[i], optionalArgs);

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

        d3.selectAll(".mainsvg:not(.static)")
            .attr("viewBox", viewportX + " " + viewportY + " " + vpW + " " + vpH);

        // check if there is pending box requests
        if (globalVar.pendingBoxRequest)
            return ;

        // check if there is literal zooming going on
        if (d3.event != null && d3.event.transform.k != 1)
            return ;

        // check if the user has moved outside the current box
        var cBoxX = globalVar.boxX[globalVar.boxX.length - 1], cBoxY = globalVar.boxY[globalVar.boxY.length - 1];
        var cBoxW = globalVar.boxW[globalVar.boxW.length - 1], cBoxH = globalVar.boxH[globalVar.boxH.length - 1];
        if (cBoxX < -1e4 || (viewportX <= cBoxX + vpW / 3 && cBoxX >= 0)
            || ((viewportX + vpW) >= (cBoxX + cBoxW) - vpW / 3 && cBoxX + cBoxW <= globalVar.curCanvas.w)
            || (viewportY <= cBoxY + vpH / 3 && cBoxY >= 0)
            || ((viewportY + vpH) >= (cBoxY + cBoxH) - vpH / 3 && cBoxY + cBoxH <= globalVar.curCanvas.h)) {

            // new box request
            var postData = "id=" + globalVar.curCanvasId + "&"
                + "x=" + (viewportX | 0) + "&"
                + "y=" + (viewportY | 0);
            for (var i = 0; i < globalVar.predicates.length; i ++)
                postData += "&predicate" + i + "=" + getSqlPredicate(globalVar.predicates[i]);
            if (param.deltaBox)
                postData += "&oboxx=" + cBoxX + "&oboxy=" + cBoxY
                    + "&oboxw=" + cBoxW + "&oboxh=" + cBoxH;
            else
                postData += "&oboxx=" + (-1e5) + "&oboxy=" + (-1e5)
                    + "&oboxw=" + (-1e5) + "&oboxh=" + (-1e5);
            if (globalVar.curCanvas.wSql.length > 0)
                postData += "&canvasw=" + globalVar.curCanvas.w;
            if (globalVar.curCanvas.hSql.length > 0)
                postData += "&canvash=" + globalVar.curCanvas.h;
            globalVar.pendingBoxRequest = true;
            $.post("/dbox", postData, function (data) {

                // response data
                var response = JSON.parse(data);
                var x = response.minx;
                var y = response.miny;
                var canvasId = response.canvasId;
                var renderData = response.renderData;

                // check if this response is already outdated
                if (canvasId != globalVar.curCanvasId) {
                    globalVar.pendingBoxRequest = false;
                    return ;
                }

                // loop over every layer to render
                var numLayers = globalVar.curCanvas.layers.length;
                for (var i = numLayers - 1; i >= 0; i --) {

                    // current layer object
                    var curLayer = globalVar.curCanvas.layers[i];

                    // if this layer is static, return
                    if (curLayer.isStatic)
                        continue;

                    // current box svg
                    var dboxSvg = d3.select(".layerg.layer" + i)
                        .select(".mainsvg");

                    // remove stale geometries
                    dboxSvg.selectAll("g")
                        .selectAll("*")
                        .filter(function(d) {
                            if (d == null) return false; // requiring all non-def stuff to be bound to data
                            if (+d.maxx < x || +d.minx > (x + response.boxW)
                                || +d.maxy < y || +d.miny > (y + response.boxH))
                                return true;
                            else
                                return false;
                        })
                        .remove();

                    // remove empty <g>s.
                    dboxSvg.selectAll("g")
                        .filter(function() {
                            return d3.select(this).select("*").empty();
                        })
                        .remove();

                    // remove those returned objects outside the viewport
                    // doing this because some backend indexers use compression
                    // and may return tuples outside viewport
                    // doing this in the backend is not efficient, so we do it here
                    // also dedup
                    var mp = {};
                    globalVar.renderData[i].forEach(function (d) {
                        mp[JSON.stringify(d)] = true;
                    });
                    renderData[i] = renderData[i].filter(function (d) {
                        if (+d.maxx < x || +d.minx > (x + response.boxW)
                            || +d.maxy < y || +d.miny > (y + response.boxH))
                            return false;
                        if (mp.hasOwnProperty(JSON.stringify(d)))
                            return false;
                        return true;});

                    // construct new globalVar.renderData
                    var newLayerData = renderData[i];
                    if (param.deltaBox) {
                        // add data from intersection w/ old box data
                        for (var j = 0; j < globalVar.renderData[i].length; j ++) {
                            var d = globalVar.renderData[i][j];
                            if (! (+d.maxx < x || +d.minx > (x + response.boxW)
                                    || +d.maxy < y || +d.miny > (y + response.boxH)))
                                newLayerData.push(d);
                        }
                    }
                    globalVar.renderData[i] = newLayerData;

                    // draw current layer
                    curLayer.rendering.parseFunction()(dboxSvg, renderData[i], optionalArgs);

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

                // modify global var
                globalVar.boxH.push(response.boxH);
                globalVar.boxW.push(response.boxW);
                globalVar.boxX.push(x);
                globalVar.boxY.push(y);
                globalVar.pendingBoxRequest = false;

                // refresh dynamic layers again while panning (#37)
                if (! globalVar.animation) {
                    var curViewport = d3.select(".mainsvg:not(.static)").attr("viewBox").split(" ");
                    RefreshDynamicLayers(curViewport[0], curViewport[1]);
                }
            });
        }
    }
    if (param.retainSizeZoom &&
        d3.zoomTransform(d3.select("#maing").node()).k > 1)
        tiles.selectAll("g")
            .selectAll("*")
            .each(zoomRescale);
};
