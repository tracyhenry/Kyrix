// render axes
function renderAxes(viewId, viewportX, viewportY, vWidth, vHeight) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    var axesg = d3.select(viewClass + ".axesg");
    axesg.selectAll("*").remove();

    // run axes function
    var axesFunc = gvd.curCanvas.axes;
    if (axesFunc == "") return;

    var axes = axesFunc.parseFunction()(getOptionalArgs(viewId));
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

        // styling for autodd
        if ("styling" in axes[i]) axes[i].styling(curg);
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
    var viewClass = ".view_" + viewId;
    var tileW = globalVar.tileW;
    var tileH = globalVar.tileH;

    // get tile ids
    var tileIds = getTileArray(viewId, viewportX, viewportY, vpW, vpH);

    // remove invisible tiles
    d3.selectAll(viewClass + ".mainsvg:not(.static)").each(function() {
        var tiles = d3
            .select(this)
            .selectAll("svg")
            .data(tileIds, function(d) {
                return d;
            });
        tiles.exit().remove();
    });

    // get new tiles
    var newTiles = d3
        .select(viewClass + ".mainsvg:not(.static)")
        .selectAll("svg")
        .data(tileIds, function(d) {
            return d;
        })
        .enter();

    newTiles.each(function(d) {
        // append tile svgs
        d3.selectAll(viewClass + ".mainsvg:not(.static)")
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

        // send request to backend to get data
        var postData =
            "id=" + gvd.curCanvasId + "&" + "x=" + d[0] + "&" + "y=" + d[1];
        for (var i = 0; i < gvd.predicates.length; i++)
            postData +=
                "&predicate" + i + "=" + getSqlPredicate(gvd.predicates[i]);
        $.ajax({
            type: "GET",
            url: globalVar.serverAddr + "/tile",
            data: postData,
            success: function(data, status) {
                // response data
                var response = JSON.parse(data);
                var x = response.minx;
                var y = response.miny;

                // remove tuples outside the viewport
                // doing this because some backend indexers use compression
                // and may return tuples outside viewport
                // doing this in the backend is not efficient, so we do it here
                var renderData = response.renderData;
                var numLayers = gvd.curCanvas.layers.length;
                for (var i = 0; i < numLayers; i++)
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

                // loop over every layer
                for (var i = numLayers - 1; i >= 0; i--) {
                    // current layer object
                    var curLayer = gvd.curCanvas.layers[i];

                    // if this layer is static, return
                    if (curLayer.isStatic) continue;

                    // current tile svg
                    var tileSvg = d3
                        .select(viewClass + ".layerg.layer" + i)
                        .select(".mainsvg")
                        .select(".a" + x + y + gvd.curCanvasId);

                    // it's possible when the tile data is delayed
                    // and this tile is already removed
                    if (tileSvg.empty()) return;

                    // draw current layer
                    curLayer.rendering.parseFunction()(
                        tileSvg,
                        renderData[i],
                        optionalArgs
                    );

                    tileSvg
                        .transition()
                        .duration(param.tileEnteringDuration)
                        .style("opacity", 1.0);

                    // register jumps
                    if (!globalVar.animation) registerJumps(viewId, tileSvg, i);

                    // highlight
                    highlightLowestSvg(viewId, tileSvg, i);

                    // rescale
                    if (gvd.curCanvas.layers[i].retainSizeZoom) {
                        tileSvg
                            .select("g:last-of-type")
                            .selectAll("*")
                            .each(function() {
                                zoomRescale(viewId, this);
                            });
                    }
                }
            }
        });
    });
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

    // check if there is pending box requests
    if (gvd.pendingBoxRequest) return;

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
        if (param.deltaBox)
            postData +=
                "&oboxx=" +
                cBoxX +
                "&oboxy=" +
                cBoxY +
                "&oboxw=" +
                cBoxW +
                "&oboxh=" +
                cBoxH;
        else
            postData +=
                "&oboxx=" +
                -1e5 +
                "&oboxy=" +
                -1e5 +
                "&oboxw=" +
                -1e5 +
                "&oboxh=" +
                -1e5;
        if (gvd.curCanvas.wSql.length > 0)
            postData += "&canvasw=" + gvd.curCanvas.w;
        if (gvd.curCanvas.hSql.length > 0)
            postData += "&canvash=" + gvd.curCanvas.h;
        gvd.pendingBoxRequest = true;
        $.ajax({
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
                if (canvasId != gvd.curCanvasId) {
                    gvd.pendingBoxRequest = false;
                    return;
                }

                // loop over every layer to render
                var numLayers = gvd.curCanvas.layers.length;
                for (var i = numLayers - 1; i >= 0; i--) {
                    // current layer object
                    var curLayer = gvd.curCanvas.layers[i];

                    // if this layer is static, return
                    if (curLayer.isStatic) continue;

                    // current box svg
                    var dboxSvg = d3
                        .select(viewClass + ".layerg.layer" + i)
                        .select(".mainsvg");

                    // remove stale geometries
                    dboxSvg
                        .selectAll("g")
                        .selectAll("*")
                        .filter(function(d) {
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
                        if (mp.hasOwnProperty(JSON.stringify(d))) return false;
                        return true;
                    });

                    // construct new globalVar.renderData
                    var newLayerData = JSON.parse(
                        JSON.stringify(renderData[i])
                    );
                    if (param.deltaBox) {
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
                    curLayer.rendering.parseFunction()(
                        dboxSvg,
                        renderData[i],
                        optionalArgs
                    );

                    // register jumps
                    if (!gvd.animation) registerJumps(viewId, dboxSvg, i);

                    // highlight
                    highlightLowestSvg(viewId, dboxSvg, i);

                    // rescale
                    if (gvd.curCanvas.layers[i].retainSizeZoom) {
                        dboxSvg
                            .select("g:last-of-type")
                            .selectAll("*")
                            .each(function() {
                                zoomRescale(viewId, this);
                            });
                    }
                }

                // modify global var
                gvd.boxH.push(response.boxH);
                gvd.boxW.push(response.boxW);
                gvd.boxX.push(x);
                gvd.boxY.push(y);
                gvd.pendingBoxRequest = false;

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

    // set viewboxes
    d3.selectAll(viewClass + ".mainsvg:not(.static)").attr(
        "viewBox",
        viewportX + " " + viewportY + " " + vpW + " " + vpH
    );

    // check if there is literal zooming going on
    // if yes, rescale the objects
    // do it both here and upon data return
    if (d3.event != null && d3.event.transform.k != 1) {
        // rescale only if there is zoom
        var numLayer = gvd.curCanvas.layers.length;
        for (var i = 0; i < numLayer; i++) {
            if (!gvd.curCanvas.layers[i].retainSizeZoom) continue;
            // check if this is just a pan
            objectSelection = d3
                .selectAll(viewClass + ".layerg.layer" + i)
                .selectAll(".lowestsvg:not(.static)")
                .selectAll("g")
                .selectAll("*");
            if (!objectSelection.empty()) {
                var transformStr = objectSelection.attr("transform");
                var match = /.*scale\(([\d.]+), ([\d.]+)\)/g.exec(transformStr);
                var scaleX = parseFloat(match[1]);
                var scaleY = parseFloat(match[2]);
            }
            if (
                Math.abs(Math.max(scaleX, scaleY) * d3.event.transform.k - 1) >
                param.eps
            )
                objectSelection.each(function() {
                    zoomRescale(viewId, this);
                });
        }
    }

    // fetch data
    if (param.fetchingScheme == "tiling")
        renderTiles(viewId, viewportX, viewportY, vpW, vpH, optionalArgs);
    else if (param.fetchingScheme == "dbox")
        renderDynamicBoxes(
            viewId,
            viewportX,
            viewportY,
            vpW,
            vpH,
            optionalArgs
        );
}
