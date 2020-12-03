// render axes
function renderAxes(viewId, viewportX, viewportY, vWidth, vHeight) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    var axesg = d3.select(viewClass + ".axesg");
    axesg.selectAll("*").remove();

    // run axes function
    var axesFunc = gvd.curCanvas.axes;
    if (axesFunc == "") return;

    var args = getOptionalArgs(viewId);
    if (gvd.curCanvas.axesSSVRPKey != "")
        args.axesSSVRPKey = gvd.curCanvas.axesSSVRPKey;
    var axes = axesFunc.parseFunction()(args);
    for (var i = 0; i < axes.length; i++) {
        // create g element
        var curg = axesg
            .append("g")
            .classed("axis", true)
            .attr("id", "axes" + i)
            .attr(
                "transform",
                "translate(" +
                    axes[i].translate[0] +
                    "," +
                    axes[i].translate[1] +
                    ")"
            );

        // construct a scale function according to current viewport
        var newScale = axes[i].scale.copy();
        var newRange = [];
        if (axes[i].dim == "x") {
            // get visible canvas range
            var lo = Math.max(viewportX, axes[i].scale.range()[0]);
            var hi = Math.min(viewportX + vWidth, axes[i].scale.range()[1]);

            // get visible viewport range
            var t = d3
                .scaleLinear()
                .domain([viewportX, viewportX + vWidth])
                .range([0, gvd.viewportWidth]);
            newScale.range([t(lo), t(hi)]);
            newScale.domain([lo, hi].map(axes[i].scale.invert));
        } else {
            // get visible canvas range
            var lo = Math.max(viewportY, axes[i].scale.range()[0]);
            var hi = Math.min(viewportY + vHeight, axes[i].scale.range()[1]);

            // get visible viewport range
            var t = d3
                .scaleLinear()
                .domain([viewportY, viewportY + vHeight])
                .range([0, gvd.viewportHeight]);
            newScale.range([t(lo), t(hi)]);
            newScale.domain([lo, hi].map(axes[i].scale.invert));
        }

        // call axis function
        curg.call(axes[i].axis.scale(newScale));

        // styling
        if ("styling" in axes[i]) axes[i].styling(curg, axes[i].dim, i, args);
    }
}

// get an array of tile ids based on the current viewport location
function getTileArray(viewId, vX, vY, vWidth, vHeight) {
    var gvd = globalVar.views[viewId];

    var tileW = globalVar.tileW;
    var tileH = globalVar.tileH;
    var w = gvd.curCanvas.w;
    var h = gvd.curCanvas.h;

    // calculate the tile range that the viewport spans
    var xStart = Math.max(0, Math.floor(vX / tileW) - param.extraTiles);
    var yStart = Math.max(0, Math.floor(vY / tileH) - param.extraTiles);
    var xEnd = Math.min(
        Math.floor(w / tileW),
        Math.floor((vX + vWidth) / tileW) + param.extraTiles
    );
    var yEnd = Math.min(
        Math.floor(h / tileH),
        Math.floor((vY + vHeight) / tileH) + param.extraTiles
    );

    var tileIds = [];
    for (var i = xStart; i <= xEnd; i++)
        for (var j = yStart; j <= yEnd; j++)
            tileIds.push([i * tileW, j * tileH, gvd.curCanvasId]);

    return tileIds;
}

function highlightLowestSvg(viewId, svg, layerId) {
    var gvd = globalVar.views[viewId];
    if (gvd.highlightPredicates.length == 0) return;
    svg.selectAll("g")
        .selectAll("*")
        .each(function(d) {
            if (d == null || gvd.highlightPredicates[layerId] == {}) return;
            if (isHighlighted(d, gvd.highlightPredicates[layerId]))
                d3.select(this).style("opacity", 1);
            else d3.select(this).style("opacity", param.dimOpacity);
        });
}

function renderTiles(viewId, viewportX, viewportY, vpW, vpH, optionalArgs) {
    var gvd = globalVar.views[viewId];
    var numLayers = gvd.curCanvas.layers.length;
    var viewClass = ".view_" + viewId;
    var tileW = globalVar.tileW;
    var tileH = globalVar.tileH;

    // check # of tile layers
    if (d3.selectAll(viewClass + ".mainsvg.tiling").size() == 0) return null;

    // get tile ids
    var tileIds = getTileArray(viewId, viewportX, viewportY, vpW, vpH);

    // assign tile ids to tile
    // and use data joins to remove old tiles and get new tiles
    var tileDataJoins = d3
        .select(viewClass + ".mainsvg.tiling")
        .selectAll("svg")
        .data(tileIds, function(d) {
            return d;
        });

    if (tileDataJoins.exit().size()) {
        // update gvd.renderData
        for (var i = 0; i < numLayers; i++)
            if (gvd.curCanvas.layers[i].fetchingScheme == "tiling") {
                gvd.renderData[i] = [];
                tileDataJoins.each(function(d) {
                    var tileId = d[0] + " " + d[1] + " " + gvd.curCanvasId;
                    gvd.renderData[i] = gvd.renderData[i].concat(
                        gvd.tileRenderData[tileId][i]
                    );
                });

                // deduplicate
                var mp = {};
                gvd.renderData[i] = gvd.renderData[i].filter(function(d) {
                    return mp.hasOwnProperty(JSON.stringify(d))
                        ? false
                        : (mp[JSON.stringify(d)] = true);
                });

                // remove exit (invisible) tiles
                d3.select(viewClass + ".layerg.layer" + i)
                    .select(".mainsvg.tiling")
                    .selectAll("svg")
                    .data(tileIds, function(d) {
                        return d;
                    })
                    .exit()
                    .remove();
            }
    }

    // get new tiles
    var tilePromises = [];
    var isJumping = Object.keys(gvd.tileRenderData).length === 0 ? true : false;
    tileDataJoins.enter().each(function(d) {
        // append tile svgs
        d3.selectAll(viewClass + ".mainsvg.tiling")
            .append("svg")
            .attr("width", tileW)
            .attr("height", tileH)
            .datum(d)
            .attr("x", d[0])
            .attr("y", d[1])
            .attr("viewBox", d[0] + " " + d[1] + " " + tileW + " " + tileH)
            .style("opacity", 0)
            .classed("a" + d[0] + d[1] + gvd.curCanvasId, true)
            .classed("view_" + viewId, true)
            .classed("lowestsvg", true);

        // initialize gvd.tileRenderData
        // (used to calculate gvd.renderData)
        var tileId = d[0] + " " + d[1] + " " + gvd.curCanvasId;
        gvd.tileRenderData[tileId] = [];
        for (var i = 0; i < numLayers; i++) gvd.tileRenderData[tileId].push([]);

        // send request to backend to get data
        var postData =
            "id=" + gvd.curCanvasId + "&" + "x=" + d[0] + "&" + "y=" + d[1];
        for (var i = 0; i < gvd.predicates.length; i++)
            postData +=
                "&predicate" + i + "=" + getSqlPredicate(gvd.predicates[i]);
        postData += "&isJumping=" + isJumping;
        var curTilePromise = $.ajax({
            type: "GET",
            url: globalVar.serverAddr + "/tile",
            data: postData,
            success: function(data, status) {
                // response data
                var response = JSON.parse(data);
                var x = response.minx;
                var y = response.miny;
                var canvasId = response.canvasId;
                if (canvasId != gvd.curCanvasId) return;
                var renderData = response.renderData;
                var numLayers = gvd.curCanvas.layers.length;

                // loop through layers
                for (var i = numLayers - 1; i >= 0; i--) {
                    // current layer object
                    var curLayer = gvd.curCanvas.layers[i];

                    // if this layer is static, continue;
                    if (curLayer.isStatic) continue;

                    // if this layer does not use tiling, continue;
                    if (curLayer.fetchingScheme != "tiling") continue;

                    // remove tuples outside the viewport
                    // doing this because some backend indexers use compression
                    // and may return tuples outside viewport
                    // doing this in the backend is not efficient, so we do it here
                    renderData[i] = renderData[i].filter(function(d) {
                        if (
                            +d.maxx < x ||
                            +d.minx > x + gvd.tileW ||
                            +d.maxy < y ||
                            +d.miny > y + gvd.tileH
                        )
                            return false;
                        return true;
                    });

                    // now add into gvd.renderData, dedup at the same time
                    if (!gvd.renderData[i]) gvd.renderData[i] = [];
                    var mp = {};
                    gvd.renderData[i].forEach(function(d) {
                        mp[JSON.stringify(d)] = true;
                    });
                    for (var j = 0; j < renderData[i].length; j++)
                        if (
                            !mp.hasOwnProperty(JSON.stringify(renderData[i][j]))
                        )
                            gvd.renderData[i].push(renderData[i][j]);

                    // save the render data of this tile for
                    // calculation of gvd.renderData later on
                    // when some tiles are removed
                    gvd.tileRenderData[x + " " + y + " " + gvd.curCanvasId][i] =
                        renderData[i];

                    // current tile svg
                    var tileSvg = d3
                        .select(viewClass + ".layerg.layer" + i)
                        .select(".mainsvg")
                        .select(".a" + x + y + gvd.curCanvasId);

                    // it's possible when the tile data is delayed
                    // and this tile is already removed
                    if (tileSvg.empty()) break;

                    // draw current layer
                    var optionalArgsMore = Object.assign({}, optionalArgs);
                    optionalArgsMore["tileX"] = x;
                    optionalArgsMore["tileY"] = y;
                    optionalArgsMore["layerId"] = i;
                    optionalArgsMore["ssvId"] = curLayer.ssvId;
                    optionalArgsMore["usmapId"] = curLayer.usmapId;
                    optionalArgsMore["staticAggregationId"] =
                        curLayer.staticAggregationId;
                    curLayer.rendering.parseFunction()(
                        tileSvg,
                        renderData[i],
                        optionalArgsMore
                    );
                    tileSvg.style("opacity", 1.0);

                    // tooltip
                    if (curLayer.tooltipColumns.length > 0)
                        makeTooltips(
                            tileSvg.selectAll("*"),
                            curLayer.tooltipColumns,
                            curLayer.tooltipAliases
                        );

                    // register jumps
                    if (!gvd.animation) registerJumps(viewId, tileSvg, i);

                    // highlight
                    highlightLowestSvg(viewId, tileSvg, i);

                    // rescale
                    tileSvg
                        .select("g:last-of-type")
                        .selectAll(".kyrix-retainsizezoom")
                        .each(function() {
                            zoomRescale(viewId, this);
                        });
                }
            }
        });
        tilePromises.push(curTilePromise);
    });

    if (tilePromises.length == 0) return null;
    return Promise.all(tilePromises);
}

function renderDynamicBoxes(
    viewId,
    viewportX,
    viewportY,
    vpW,
    vpH,
    optionalArgs
) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // check if there is dbox layers
    if (d3.selectAll(viewClass + ".mainsvg.dbox").size() == 0) return null;

    // check if there is pending box requests
    if (gvd.pendingBoxRequest == gvd.curCanvasId) return null;

    // check if the user has moved outside the current box
    var cBoxX = gvd.boxX[gvd.boxX.length - 1],
        cBoxY = gvd.boxY[gvd.boxY.length - 1];
    var cBoxW = gvd.boxW[gvd.boxW.length - 1],
        cBoxH = gvd.boxH[gvd.boxH.length - 1];
    if (
        cBoxX < -1e4 ||
        (viewportX <= cBoxX + vpW / 3 && cBoxX >= 0) ||
        (viewportX + vpW >= cBoxX + cBoxW - vpW / 3 &&
            cBoxX + cBoxW <= gvd.curCanvas.w) ||
        (viewportY <= cBoxY + vpH / 3 && cBoxY >= 0) ||
        (viewportY + vpH >= cBoxY + cBoxH - vpH / 3 &&
            cBoxY + cBoxH <= gvd.curCanvas.h)
    ) {
        // new box request
        var postData =
            "id=" +
            gvd.curCanvasId +
            "&" +
            "viewId=" +
            viewId +
            "&" +
            "x=" +
            (viewportX | 0) +
            "&" +
            "y=" +
            (viewportY | 0);
        for (var i = 0; i < gvd.predicates.length; i++)
            postData +=
                "&predicate" + i + "=" + getSqlPredicate(gvd.predicates[i]);
        postData +=
            "&oboxx=" +
            cBoxX +
            "&oboxy=" +
            cBoxY +
            "&oboxw=" +
            cBoxW +
            "&oboxh=" +
            cBoxH;
        postData += "&isJumping=" + (cBoxX < -1e4 ? true : false);
        if (gvd.curCanvas.wSql.length > 0)
            postData += "&canvasw=" + gvd.curCanvas.w;
        if (gvd.curCanvas.hSql.length > 0)
            postData += "&canvash=" + gvd.curCanvas.h;
        gvd.pendingBoxRequest = gvd.curCanvasId;
        return $.ajax({
            type: "GET",
            url: globalVar.serverAddr + "/dbox",
            data: postData,
            success: function(data) {
                // response data
                var response = JSON.parse(data);
                var x = response.minx;
                var y = response.miny;
                var canvasId = response.canvasId;
                var renderData = response.renderData;

                // check if this response is already outdated
                // TODO: only checking canvasID might not be sufficient
                if (canvasId != gvd.pendingBoxRequest) return;

                // loop over every layer to render
                var numLayers = gvd.curCanvas.layers.length;
                for (var i = numLayers - 1; i >= 0; i--) {
                    // current layer object
                    var curLayer = gvd.curCanvas.layers[i];

                    // if this layer is static, continue
                    if (curLayer.isStatic) continue;

                    // if this layer does not use dbox, continue
                    if (curLayer.fetchingScheme != "dbox") continue;

                    // current box svg
                    var dboxSvg = d3
                        .select(viewClass + ".layerg.layer" + i)
                        .select(".mainsvg");

                    // remove stale geometries
                    dboxSvg
                        .selectAll("g")
                        .selectAll("*")
                        .filter(function(d) {
                            if (!curLayer.deltaBox) return true;
                            if (d == null) return false; // requiring all non-def stuff to be bound to data
                            if (
                                +d.maxx < x ||
                                +d.minx > x + response.boxW ||
                                +d.maxy < y ||
                                +d.miny > y + response.boxH
                            )
                                return true;
                            else return false;
                        })
                        .remove();

                    // remove empty <g>s.
                    dboxSvg
                        .selectAll("g")
                        .filter(function() {
                            return d3
                                .select(this)
                                .select("*")
                                .empty();
                        })
                        .remove();

                    // remove those returned objects outside the viewport
                    // doing this because some backend indexers use compression
                    // and may return tuples outside viewport
                    // doing this in the backend is not efficient, so we do it here
                    // also dedup
                    var mp = {};
                    gvd.renderData[i].forEach(function(d) {
                        mp[JSON.stringify(d)] = true;
                    });
                    renderData[i] = renderData[i].filter(function(d) {
                        if (
                            +d.maxx < x ||
                            +d.minx > x + response.boxW ||
                            +d.maxy < y ||
                            +d.miny > y + response.boxH
                        )
                            return false;
                        if (
                            curLayer.deltaBox &&
                            mp.hasOwnProperty(JSON.stringify(d))
                        )
                            return false;
                        return true;
                    });

                    // construct new globalVar.renderData
                    var newLayerData = JSON.parse(
                        JSON.stringify(renderData[i])
                    );
                    if (curLayer.deltaBox) {
                        // add data from intersection w/ old box data
                        for (var j = 0; j < gvd.renderData[i].length; j++) {
                            var d = gvd.renderData[i][j];
                            if (
                                !(
                                    +d.maxx < x ||
                                    +d.minx > x + response.boxW ||
                                    +d.maxy < y ||
                                    +d.miny > y + response.boxH
                                )
                            )
                                newLayerData.push(d);
                        }
                    }
                    gvd.renderData[i] = newLayerData;

                    // draw current layer
                    var optionalArgsMore = Object.assign({}, optionalArgs);
                    optionalArgsMore["boxX"] = x;
                    optionalArgsMore["boxY"] = y;
                    optionalArgsMore["boxW"] = response.boxW;
                    optionalArgsMore["boxH"] = response.boxH;
                    optionalArgsMore["layerId"] = i;
                    optionalArgsMore["ssvId"] = curLayer.ssvId;
                    optionalArgsMore["usmapId"] = curLayer.usmapId;
                    optionalArgsMore["staticAggregationId"] =
                        curLayer.staticAggregationId;
                    curLayer.rendering.parseFunction()(
                        dboxSvg,
                        renderData[i],
                        optionalArgsMore
                    );

                    // tooltip
                    if (curLayer.tooltipColumns.length > 0)
                        makeTooltips(
                            dboxSvg.select("g:last-of-type").selectAll("*"),
                            curLayer.tooltipColumns,
                            curLayer.tooltipAliases
                        );

                    // register jumps
                    if (!gvd.animation) registerJumps(viewId, dboxSvg, i);

                    // highlight
                    highlightLowestSvg(viewId, dboxSvg, i);

                    // rescale
                    dboxSvg
                        .select("g:last-of-type")
                        .selectAll(".kyrix-retainsizezoom")
                        .each(function() {
                            zoomRescale(viewId, this);
                        });
                }

                // modify global var
                gvd.boxH.push(response.boxH);
                gvd.boxW.push(response.boxW);
                gvd.boxX.push(x);
                gvd.boxY.push(y);
                gvd.pendingBoxRequest = null;

                // refresh dynamic layers again while panning (#37)
                if (!gvd.animation) {
                    var curViewport = d3
                        .select(viewClass + ".mainsvg:not(.static)")
                        .attr("viewBox")
                        .split(" ");
                    RefreshDynamicLayers(
                        viewId,
                        curViewport[0],
                        curViewport[1]
                    );
                }
            }
        });
    }

    return null;
}

function RefreshDynamicLayers(viewId, viewportX, viewportY) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // current viewport
    viewportX = +viewportX;
    viewportY = +viewportY;
    var vpW, vpH;
    if (d3.select(viewClass + ".mainsvg:not(.static)").size() == 0)
        (vpW = gvd.viewportWidth), (vpH = gvd.viewportHeight);
    else {
        var curViewport = d3
            .select(viewClass + ".mainsvg:not(.static)")
            .attr("viewBox")
            .split(" ");
        vpW = +curViewport[2];
        vpH = +curViewport[3];
    }

    // render axes
    renderAxes(viewId, viewportX, viewportY, vpW, vpH);

    // no dynamic layers? return
    if (d3.select(viewClass + ".mainsvg:not(.static)").size() == 0) return;

    // optional rendering args
    var optionalArgs = getOptionalArgs(viewId);
    optionalArgs["viewportX"] = viewportX;
    optionalArgs["viewportY"] = viewportY;

    // fetch data
    var tilePromise = renderTiles(
        viewId,
        viewportX,
        viewportY,
        vpW,
        vpH,
        optionalArgs
    );
    var dboxPromise = renderDynamicBoxes(
        viewId,
        viewportX,
        viewportY,
        vpW,
        vpH,
        optionalArgs
    );
    if (tilePromise != null || dboxPromise != null)
        Promise.all([tilePromise, dboxPromise]).then(function() {
            if (
                gvd.animation != param.semanticZoom &&
                gvd.animation != param.slide
            )
                d3.selectAll(viewClass + ".oldlayerg")
                    .transition()
                    .duration(param.literalZoomFadeOutDuration)
                    .style("opacity", 0)
                    .remove();
        });
}
