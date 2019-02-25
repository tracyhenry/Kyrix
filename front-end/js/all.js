
export function getViews(){
    return globalVar.views;
}

export function Pan(viewId, panX, panY, delta){
    var globalVarDict = globalVar.views[viewId];

    d3.transition()
        .duration(1000)
        .tween("panTween", function () {
            var i = d3.interpolateNumber(1, panX);
            var j = d3.interpolateNumber(1, panY);
            var initialTransform = d3.zoomTransform(d3.select(".view_" + viewId).node());
            return function (t) {
                var deltaX = i(t) * delta;
                var deltaY = j(t);
                d3.select(".view_" + viewId).call(globalVarDict.zoom.transform,
                    initialTransform.translate(deltaX, deltaY));
            };
        });
}// render axes
function renderAxes(viewId, viewportX, viewportY, vWidth, vHeight) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    var axesg = d3.select(viewClass + ".axesg");
    axesg.selectAll("*").remove();

    // run axes function
    var axesFunc = gvd.curCanvas.axes;
    if (axesFunc == "")
        return ;

    var axes = axesFunc.parseFunction()(getOptionalArgs(viewId));
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
            newScale.range([0, gvd.viewportWidth]);
        }
        else {
            newRange.push(viewportY), newRange.push(viewportY + vHeight);
            newScale.range([0, gvd.viewportHeight]);
        }
        newScale.domain(newRange.map(axes[i].scale.invert));

        // call axis function
        curg.call(axes[i].axis.scale(newScale));
    }
};

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
    var xEnd = Math.min(Math.floor(w / tileW), Math.floor((vX + vWidth) / tileW) + param.extraTiles);
    var yEnd = Math.min(Math.floor(h / tileH), Math.floor((vY + vHeight) / tileH) + param.extraTiles);

    var tileIds = [];
    for (var i = xStart; i <= xEnd; i ++)
        for (var j = yStart; j <= yEnd; j ++)
            tileIds.push([i * tileW, j * tileH, gvd.curCanvasId]);

    return tileIds;
};

function highlightLowestSvg(viewId, svg, layerId) {

    var gvd = globalVar.views[viewId];
    if (gvd.highlightPredicates.length == 0)
        return ;
    svg.selectAll("g")
        .selectAll("*")
        .each(function (d) {
            if (d == null || gvd.highlightPredicates[layerId] == {})
                return ;
            if (isHighlighted(d, gvd.highlightPredicates[layerId]))
                d3.select(this).style("opacity", 1);
            else
                d3.select(this).style("opacity", param.dimOpacity);
        });
}

function renderTiles(viewId, viewportX, viewportY, vpW, vpH, optionalArgs) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;
    var tileW = globalVar.tileW;
    var tileH = globalVar.tileH;

    // get tile ids
    var tileIds = getTileArray(viewId,
        viewportX, viewportY, vpW, vpH);

    // remove invisible tiles
    d3.selectAll(viewClass + ".mainsvg:not(.static)")
        .each(function () {
            var tiles = d3.select(this)
                .selectAll("svg")
                .data(tileIds, function (d){return d;});
            tiles.exit().remove();
        });

    // get new tiles
    var newTiles = d3.select(viewClass + ".mainsvg:not(.static)")
        .selectAll("svg")
        .data(tileIds, function (d) {return d;})
        .enter();

    newTiles.each(function (d) {
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
        var postData = "id=" + gvd.curCanvasId + "&"
            + "x=" + d[0] + "&"
            + "y=" + d[1];
        for (var i = 0; i < gvd.predicates.length; i ++)
            postData += "&predicate" + i + "=" + getSqlPredicate(gvd.predicates[i]);
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
            var numLayers = gvd.curCanvas.layers.length;
            for (var i = 0; i < numLayers; i ++)
                renderData[i] = renderData[i].filter(function (d) {
                    if (+d.maxx < x || +d.minx > (x + gvd.tileW)
                        || +d.maxy < y || +d.miny > (y + gvd.tileH))
                        return false;
                    return true;});

            // loop over every layer
            for (var i = numLayers - 1; i >= 0; i--) {

                // current layer object
                var curLayer = gvd.curCanvas.layers[i];

                // if this layer is static, return
                if (curLayer.isStatic)
                    continue;

                // current tile svg
                var tileSvg = d3.select(viewClass + ".layerg.layer" + i)
                    .select(".mainsvg")
                    .select(".a" + x + y + gvd.curCanvasId);

                // it's possible when the tile data is delayed
                // and this tile is already removed
                if (tileSvg.empty())
                    return;

                // draw current layer
                curLayer.rendering.parseFunction()(tileSvg, renderData[i], optionalArgs);

                tileSvg.transition()
                    .duration(param.tileEnteringDuration)
                    .style("opacity", 1.0);

                // register jumps
                if (!globalVar.animation)
                    registerJumps(viewId, tileSvg, i);

                // highlight
                highlightLowestSvg(viewId, tileSvg, i);
            }
        });
    });
}

function renderDynamicBoxes(viewId, viewportX, viewportY, vpW, vpH, optionalArgs) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // check if there is pending box requests
    if (gvd.pendingBoxRequest)
        return ;

    // check if the user has moved outside the current box
    var cBoxX = gvd.boxX[gvd.boxX.length - 1], cBoxY = gvd.boxY[gvd.boxY.length - 1];
    var cBoxW = gvd.boxW[gvd.boxW.length - 1], cBoxH = gvd.boxH[gvd.boxH.length - 1];
    if (cBoxX < -1e4 || (viewportX <= cBoxX + vpW / 3 && cBoxX >= 0)
        || ((viewportX + vpW) >= (cBoxX + cBoxW) - vpW / 3 && cBoxX + cBoxW <= gvd.curCanvas.w)
        || (viewportY <= cBoxY + vpH / 3 && cBoxY >= 0)
        || ((viewportY + vpH) >= (cBoxY + cBoxH) - vpH / 3 && cBoxY + cBoxH <= gvd.curCanvas.h)) {

        // new box request
        var postData = "id=" + gvd.curCanvasId + "&"
            + "viewId=" + viewId + "&"
            + "x=" + (viewportX | 0) + "&"
            + "y=" + (viewportY | 0);
        for (var i = 0; i < gvd.predicates.length; i ++)
            postData += "&predicate" + i + "=" + getSqlPredicate(gvd.predicates[i]);
        if (param.deltaBox)
            postData += "&oboxx=" + cBoxX + "&oboxy=" + cBoxY
                + "&oboxw=" + cBoxW + "&oboxh=" + cBoxH;
        else
            postData += "&oboxx=" + (-1e5) + "&oboxy=" + (-1e5)
                + "&oboxw=" + (-1e5) + "&oboxh=" + (-1e5);
        if (gvd.curCanvas.wSql.length > 0)
            postData += "&canvasw=" + gvd.curCanvas.w;
        if (gvd.curCanvas.hSql.length > 0)
            postData += "&canvash=" + gvd.curCanvas.h;
        gvd.pendingBoxRequest = true;
        $.post("/dbox", postData, function (data) {

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
                return ;
            }

            // loop over every layer to render
            var numLayers = gvd.curCanvas.layers.length;
            for (var i = numLayers - 1; i >= 0; i --) {

                // current layer object
                var curLayer = gvd.curCanvas.layers[i];

                // if this layer is static, return
                if (curLayer.isStatic)
                    continue;

                // current box svg
                var dboxSvg = d3.select(viewClass + ".layerg.layer" + i)
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
                gvd.renderData[i].forEach(function (d) {
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
                var newLayerData = JSON.parse(JSON.stringify(renderData[i]));
                if (param.deltaBox) {
                    // add data from intersection w/ old box data
                    for (var j = 0; j < gvd.renderData[i].length; j ++) {
                        var d = gvd.renderData[i][j];
                        if (! (+d.maxx < x || +d.minx > (x + response.boxW)
                                || +d.maxy < y || +d.miny > (y + response.boxH)))
                            newLayerData.push(d);
                    }
                }
                gvd.renderData[i] = newLayerData;

                // draw current layer
                curLayer.rendering.parseFunction()(dboxSvg, renderData[i], optionalArgs);

                // register jumps
                if (! gvd.animation)
                    registerJumps(viewId, dboxSvg, i);

                // highlight
                highlightLowestSvg(viewId, dboxSvg, i);
            }

            // modify global var
            gvd.boxH.push(response.boxH);
            gvd.boxW.push(response.boxW);
            gvd.boxX.push(x);
            gvd.boxY.push(y);
            gvd.pendingBoxRequest = false;

            // refresh dynamic layers again while panning (#37)
            if (! gvd.animation) {
                var curViewport = d3.select(viewClass + ".mainsvg:not(.static)").attr("viewBox").split(" ");
                RefreshDynamicLayers(viewId, curViewport[0], curViewport[1]);
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
        vpW = gvd.viewportWidth, vpH = gvd.viewportHeight;
    else {
        var curViewport = d3.select(viewClass + ".mainsvg:not(.static)").attr("viewBox").split(" ");
        vpW = +curViewport[2];
        vpH = +curViewport[3];
    }

    // render axes
    renderAxes(viewId, viewportX, viewportY, vpW, vpH);

    // no dynamic layers? return
    if (d3.select(viewClass + ".mainsvg:not(.static)").size() == 0)
        return ;

    // optional rendering args
    var optionalArgs = getOptionalArgs(viewId);
    optionalArgs["viewportX"] = viewportX;
    optionalArgs["viewportY"] = viewportY;

    // set viewboxes
    d3.selectAll(viewClass + ".mainsvg:not(.static)")
        .attr("viewBox", viewportX + " " + viewportY + " " + vpW + " " + vpH);

    // check if there is literal zooming going on
    // if yes, rescale the objects if asked
    if (d3.event != null && d3.event.transform.k != 1) {
        // apply additional zoom transforms
        if (param.retainSizeZoom)
            d3.selectAll(viewClass + ".lowestsvg:not(.static)")
                .selectAll("g")
                .selectAll("*")
                .each(function () {
                    zoomRescale(viewId, this);
                });
    }
    else {
        if (param.fetchingScheme == "tiling")
            renderTiles(viewId, viewportX, viewportY, vpW, vpH, optionalArgs);
        else if (param.fetchingScheme == "dbox")
            renderDynamicBoxes(viewId, viewportX, viewportY, vpW, vpH, optionalArgs);
    }
};
function removePopovers(viewId) {

    var selector = ".popover";
    if (viewId != null)
        selector += ".view_" + viewId;
    d3.selectAll(selector).remove();
};

function removePopoversSmooth(viewId) {

    var selector = ".popover";
    if (viewId != null)
        selector += ".view_" + viewId;
    d3.selectAll(selector)
        .transition()
        .duration(param.popoverOutDuration)
        .style("opacity", 0)
        .remove();
};

// disable and remove stuff before jump
function preJump(viewId) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // unbind zoom
    d3.select(viewClass + ".maing").on(".zoom", null);

    // use transition to remove axes, static trims & popovers
    d3.select(viewClass + ".axesg").transition()
        .duration(param.axesOutDuration)
        .style("opacity", 0);
    removePopoversSmooth(viewId);

    // change .mainsvg to .oldmainsvg, and .layerg to .oldlayerg
    d3.selectAll(viewClass + ".mainsvg")
        .classed("mainsvg", false)
        .classed("oldmainsvg", true);
    d3.selectAll(viewClass + ".layerg")
        .classed("layerg", false)
        .classed("oldlayerg", true);

    // remove cursor pointers and onclick listeners
    d3.select(viewClass + ".viewsvg")
        .selectAll("*")
        .style("cursor", "auto")
        .on("click", null);
    d3.selectAll("button" + viewClass)
        .attr("disabled", true);

    gvd.animation = true;
};

function postJump(viewId, zoomType) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    function postOldLayerRemoval() {

        // set up zoom
        setupZoom(viewId, 1);

        // set up button states
        setButtonState(viewId);

        // animation stopped now
        gvd.animation = false;

        // register jumps after every jump
        // reason: some coordination-based jumps maybe become applicable after a jump
        for (var i = 0; i < globalVar.project.views.length; i ++) {
            var nViewId = globalVar.project.views[i].id;
            var nGvd = globalVar.views[nViewId];
            var nViewClass = ".view_" + nViewId;
            for (var j = 0; j < nGvd.curCanvas.layers.length; j ++) {
                var curLayer = nGvd.curCanvas.layers[j];
                if (! curLayer.isStatic && param.fetchingScheme == "tiling")
                    d3.select(nViewClass + ".layerg.layer" + j)
                        .select("svg")
                        .selectAll(".lowestsvg")
                        .each(function() {
                            registerJumps(nViewId, d3.select(this), j);
                        });
                else
                    registerJumps(nViewId, d3.select(nViewClass + ".layerg.layer" + j).select("svg"), j);
            }
        }
    };

    if (zoomType == null)
        zoomType = param.semanticZoom;

    // set the viewBox & opacity of the new .mainsvgs
    // because d3 tween does not get t to 1.0
    d3.selectAll(viewClass + ".mainsvg:not(.static)")
        .attr("viewBox", gvd.initialViewportX + " "
            + gvd.initialViewportY + " "
            + gvd.viewportWidth + " "
            + gvd.viewportHeight)
        .style("opacity", 1);
    d3.selectAll(viewClass + ".mainsvg.static").attr("viewBox", "0 0 "
        + gvd.viewportWidth + " "
        + gvd.viewportHeight)
        .style("opacity", 1);

    // display axes
    d3.select(viewClass + ".axesg").transition()
        .duration(param.axesInDuration)
        .style("opacity", 1);

    // use a d3 transition to remove things based on zoom type
    var removalDelay = 0;
    if (zoomType != param.semanticZoom)
        removalDelay = param.oldRemovalDelay;
    var numOldLayer = d3.selectAll(viewClass + ".oldlayerg").size();
    d3.selectAll(viewClass + ".oldlayerg")
        .transition()
        .duration(removalDelay)
        .remove()
        .on("end", postOldLayerRemoval);
    if (numOldLayer == 0)
        postOldLayerRemoval();
};

// animate semantic zoom
function semanticZoom(viewId, jump, predArray, newVpX, newVpY, tuple) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // log history
    logHistory(viewId, jump.type);

    // change global vars
    gvd.curCanvasId = jump.destId;
    gvd.predicates = predArray;
    gvd.highlightPredicates = [];
    gvd.initialViewportX = newVpX;
    gvd.initialViewportY = newVpY;

    // prefetch canvas object by sending an async request to server
    var postData = "id=" + gvd.curCanvasId;
    for (var i = 0; i < gvd.predicates.length; i ++)
        postData += "&predicate" + i + "=" + getSqlPredicate(gvd.predicates[i]);
    if (! (postData in globalVar.cachedCanvases)) {
        $.ajax({
            type : "POST",
            url : "canvas",
            data : postData,
            success : function (data, status) {
                if (! (postData in globalVar.cachedCanvases)) {
                    globalVar.cachedCanvases[postData] = {};
                    globalVar.cachedCanvases[postData].canvasObj = JSON.parse(data).canvas;
                    globalVar.cachedCanvases[postData].jumps = JSON.parse(data).jump;
                    globalVar.cachedCanvases[postData].staticData = JSON.parse(data).staticData;
                }
            },
            async : true
        });
    }

    // disable stuff before animation
    preJump(viewId);

    // whether this semantic zoom is also geometric
    var zoomType = gvd.history[gvd.history.length - 1].zoomType;
    var enteringAnimation = (zoomType == param.semanticZoom ? true : false);

    // calculate tuple boundary
    var curViewport = [0, 0, gvd.viewportWidth, gvd.viewportHeight];
    if (d3.select(viewClass + ".oldmainsvg:not(.static)").size())
        curViewport = d3.select(viewClass + ".oldmainsvg:not(.static)").attr("viewBox").split(" ");
    for (var i = 0; i < curViewport.length; i ++)
        curViewport[i] = +curViewport[i];
    var tupleWidth = +tuple.maxx - tuple.minx;
    var tupleHeight = +tuple.maxy - tuple.miny;
    var minx, maxx, miny, maxy;
    if (tupleWidth == 0 || tupleHeight == 0) {  // check when placement func does not exist
        minx = gvd.curCanvas.w;
        miny = gvd.curCanvas.h;
        maxx = maxy = 0;
        d3.select(viewClass + ".viewsvg")
            .selectAll("*")
            .filter(function (d){
                return d == tuple;
            })
            .each(function () {
                var bbox = this.getBBox();
                minx = Math.min(minx, bbox.x);
                miny = Math.min(miny, bbox.y);
                maxx = Math.max(maxx, bbox.x + bbox.width);
                maxy = Math.max(maxy, bbox.y + bbox.height);
            });
    }
    else {
        minx = +tuple.cx - tupleWidth / 2.0;
        maxx = +tuple.cx + tupleWidth / 2.0;
        miny = +tuple.cy - tupleHeight / 2.0;
        maxy = +tuple.cy + tupleHeight / 2.0;
    }

    // use tuple boundary to calculate start and end views, and log them to the last history object
    var startView = [curViewport[2] / 2.0, curViewport[3] / 2.0, curViewport[2]];
    var endView = [minx + (maxx - minx) / 2.0 - curViewport[0],
        miny + (maxy - miny) / 2.0 - curViewport[1],
        (maxx - minx) / (enteringAnimation ? param.zoomScaleFactor : 1)];
    gvd.history[gvd.history.length - 1].startView = startView;
    gvd.history[gvd.history.length - 1].endView = endView;

    // set up zoom transitions
    param.zoomDuration = d3.interpolateZoom(startView, endView).duration;
    param.enteringDelay = Math.round(param.zoomDuration * param.enteringDelta);
    d3.transition("zoomInTween_" + viewId)
        .duration(param.zoomDuration)
        .tween("zoomInTween", function() {

            var i = d3.interpolateZoom(startView, endView);
            return function(t) {zoomAndFade(t, i(t));};
        })
        .on("start", function () {

            // schedule a new entering transition
            if (enteringAnimation)
                d3.transition("enterTween_" + viewId)
                    .delay(param.enteringDelay)
                    .duration(param.enteringDuration)
                    .tween("enterTween", function() {

                        return function(t) {enterAndScale(d3.easeCircleOut(t));};
                    })
                    .on("start", function() {

                        // get the canvas object for the destination canvas
                        var gotCanvas = getCurCanvas(viewId);
                        gotCanvas.then(function () {

                            // static trim
                            renderStaticLayers(viewId);

                            // render
                            RefreshDynamicLayers(viewId, newVpX, newVpY);
                        });

                    })
                    .on("end", function () {

                        postJump(viewId, zoomType);
                    });
        })
        .on("end", function () {

            if (! enteringAnimation) {

                // get the canvas object for the destination canvas
                var gotCanvas = getCurCanvas(viewId);
                gotCanvas.then(function () {

                    // static trim
                    renderStaticLayers(viewId);

                    // render
                    RefreshDynamicLayers(viewId, newVpX, newVpY);

                    // clean up
                    postJump(viewId, zoomType);
                })
            }
        });

    function zoomAndFade(t, v) {

        var vWidth = v[2];
        var vHeight = gvd.viewportHeight / gvd.viewportWidth * vWidth;
        var minx = curViewport[0] + v[0] - vWidth / 2.0;
        var miny = curViewport[1] + v[1] - vHeight / 2.0;

        // change viewBox of dynamic layers
        d3.selectAll(viewClass + ".oldmainsvg:not(.static)")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change viewBox of static layers
        minx = v[0] - vWidth / 2.0;
        miny = v[1] - vHeight / 2.0;
        d3.selectAll(viewClass + ".oldmainsvg.static")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change opacity
        if (enteringAnimation) {
            var threshold = param.fadeThreshold;
            if (t >= threshold) {
                d3.selectAll(viewClass + ".oldmainsvg")
                    .style("opacity", 1.0 - (t - threshold) / (1.0 - threshold));
            }
        }
    };

    function enterAndScale(t) {

        var vWidth = gvd.viewportWidth * param.enteringScaleFactor
            / (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var vHeight = gvd.viewportHeight * param.enteringScaleFactor
            / (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var minx = newVpX + gvd.viewportWidth / 2.0 - vWidth / 2.0;
        var miny = newVpY + gvd.viewportHeight / 2.0 - vHeight / 2.0;

        // change viewBox of dynamic layers
        d3.selectAll(viewClass + ".mainsvg:not(.static)")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change viewbox of static layers
        minx = gvd.viewportWidth / 2 - vWidth / 2;
        miny = gvd.viewportHeight / 2 - vHeight / 2;
        d3.selectAll(viewClass + ".mainsvg.static")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change opacity
        d3.selectAll(viewClass + ".mainsvg").style("opacity", t);
    };
};

function load(predArray, newVpX, newVpY, jump) {

    var destViewId = jump.destViewId;

    // stop any tweens
    d3.selection().interrupt("zoomInTween_" + destViewId);
    d3.selection().interrupt("enterTween_" + destViewId);
    d3.selection().interrupt("zoomOutTween_" + destViewId);
    d3.selection().interrupt("fadeTween_" + destViewId);
    d3.selection().interrupt("literalTween_" + destViewId);

    // reset global vars
    var gvd = globalVar.views[destViewId];
    gvd.curCanvasId = jump.destId;
    gvd.predicates = predArray;
    gvd.highlightPredicates = [];
    gvd.initialViewportX = newVpX;
    gvd.initialViewportY = newVpY;
    gvd.renderData = null;
    gvd.pendingBoxRequest = false;
    gvd.history = [];

    // pre animation
    preJump(destViewId);

    // draw buttons because they were not created if it was an empty view
    drawZoomButtons(destViewId);

    // fetch static data from server, then render the view
    var gotCanvas = getCurCanvas(destViewId);
    gotCanvas.then(function () {

        // render static layers
        renderStaticLayers(destViewId);

        // post animation
        postJump(destViewId);
    });
}

function highlight(predArray, jump) {

    var destViewId = jump.destViewId;
    var gvd = globalVar.views[destViewId];
    if (gvd.curCanvasId != jump.destId)
        return ;
    gvd.highlightPredicates = predArray;
    for (var i = 0; i < gvd.curCanvas.layers.length; i ++)
        d3.selectAll(".view_" + destViewId + ".layerg.layer" + i)
            .selectAll(".lowestsvg")
            .each(function() {
                highlightLowestSvg(destViewId, d3.select(this), i);
            });
}

// register jump info
function registerJumps(viewId, svg, layerId) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    var jumps = gvd.curJump;
    var shapes = svg.select("g:last-of-type").selectAll("*");
    var optionalArgs = getOptionalArgs(viewId);
    optionalArgs["layerId"] = layerId;

    shapes.each(function(p) {

        // check if this shape has jumps
        var hasJump = false;
        for (var k = 0; k < jumps.length; k ++)
            if ((jumps[k].type == param.semanticZoom
                || jumps[k].type == param.geometricSemanticZoom
                || (jumps[k].type == param.load && jumps[k].sourceViewId == viewId)
                || (jumps[k].type == param.highlight && jumps[k].sourceViewId == viewId
                    && globalVar.views[jumps[k].destViewId].curCanvasId == jumps[k].destId))
                && jumps[k].selector.parseFunction()(p, optionalArgs)) {
                hasJump = true;
                break;
            }
        if (! hasJump)
            return ;

        // make cursor a hand when hovering over this shape
        d3.select(this).style("cursor", "zoom-in");

        // register onclick listener
        d3.select(this).on("click", function (d) {

            // stop the click event from propagating up
            d3.event.stopPropagation();

            // remove all popovers first
            removePopovers(viewId);

            // create a jumpoption popover using bootstrap
            d3.select("body").append("div")
                .classed("view_" + viewId + " popover fade right in", true)
                .attr("role", "tooltip")
                .attr("id", "jumppopover")
                .append("div")
                .classed("view_" + viewId + " arrow popoverarrow", true)
                .attr("id", "popoverarrow");
            d3.select(viewClass + "#jumppopover")
                .append("h2")
                .classed("view_" + viewId + " popover-title", true)
                .attr("id", "popovertitle")
                .html("Jump Options")
                .append("a")
                .classed("view_" + viewId + " close", true)
                .attr("href", "#")
                .attr("id", "popoverclose")
                .html("&times;")
                .on("click", function() {removePopovers(viewId);});
            d3.select(viewClass + "#jumppopover")
                .append("div")
                .classed("view_" + viewId + " popover-content list-group", true)
                .attr("id", "popovercontent");

            // add jump options
            for (var k = 0; k < jumps.length; k ++) {

                // check if this jump is applied in this layer
                if ((jumps[k].type != param.semanticZoom
                    && jumps[k].type != param.geometricSemanticZoom
                    && (jumps[k].type != param.load || jumps[k].sourceViewId != viewId)
                    && (jumps[k].type != param.highlight || jumps[k].sourceViewId != viewId
                            || globalVar.views[jumps[k].destViewId].curCanvasId != jumps[k].destId))
                    || ! jumps[k].selector.parseFunction()(d, optionalArgs))
                    continue;

                // create table cell and append it to #popovercontent
                var optionText ="<b>ZOOM IN </b>";
                if (jumps[k].type == param.load)
                    optionText = "<b>LOAD " + jumps[k].destViewId + " VIEW with </b>";
                else if (jumps[k].type == param.highlight)
                    optionText = "<b>HIGHLIGHT in " + jumps[k].destViewId + " VIEW </b>";
                optionText += jumps[k].name.parseFunction() == null ? jumps[k].name
                    : jumps[k].name.parseFunction()(d, optionalArgs);
                var jumpOption = d3.select(viewClass + "#popovercontent")
                    .append("a")
                    .classed("list-group-item", true)
                    .attr("href", "#")
                    .datum(d)
                    .attr("data-jump-id", k)
                    .html(optionText);

                // on click
                jumpOption.on("click", function (d) {

                    d3.event.preventDefault();
                    var jump = jumps[d3.select(this).attr("data-jump-id")];
                    removePopovers(viewId);

                    // calculate new predicates
                    var predDict = jump.predicates.parseFunction()(d, optionalArgs);
                    var predArray = [];
                    var numLayer = getCanvasById(jump.destId).layers.length;
                    for (var i = 0; i < numLayer; i ++)
                        if (("layer" + i) in predDict)
                            predArray.push(predDict["layer" + i]);
                        else
                            predArray.push({});

                    // calculate new viewport
                    var newVpX, newVpY;
                    if (jump.viewport.length > 0) {
                        var viewportFunc = jump.viewport.parseFunction();
                        var viewportFuncRet = viewportFunc(d, optionalArgs);

                        if ("constant" in viewportFuncRet) {
                            // constant viewport, no predicate
                            newVpX = viewportFuncRet["constant"][0];
                            newVpY = viewportFuncRet["constant"][1];
                        }
                        else if ("centroid" in viewportFuncRet) { //TODO: this is not tested
                            // viewport is fixed at a certain tuple
                            var postData = "canvasId=" + jump.destId;
                            var predDict = viewportFuncRet["centroid"];
                            for (var i = 0; i < numLayer; i ++)
                                if (("layer" + i) in predDict)
                                    postData += "&predicate" + i + "=" + getSqlPredicate(predDict["layer" + i]);
                                else
                                    postData += "&predicate" + i + "=";
                            $.ajax({
                                type: "POST",
                                url: "viewport",
                                data: postData,
                                success: function (data, status) {
                                    var cx = JSON.parse(data).cx;
                                    var cy = JSON.parse(data).cy;
                                    newVpX = cx - gvd.viewportWidth / 2;
                                    newVpY = cy - gvd.viewportHeight / 2;
                                },
                                async: false
                            });
                        }
                        else
                            throw new Error("Unrecognized new viewport function return value.");
                    }

                    if (jump.type == param.semanticZoom || jump.type == param.geometricSemanticZoom)
                        semanticZoom(viewId, jump, predArray, newVpX, newVpY, d);
                    else if (jump.type == param.load)
                        load(predArray, newVpX, newVpY, jump);
                    else if (jump.type == param.highlight)
                        highlight(predArray, jump);
                });
            }

            // position jump popover according to event x/y and its width/height
            var popoverHeight = d3.select(viewClass + "#jumppopover")
                .node()
                .getBoundingClientRect()
                .height;
            d3.select(viewClass + "#jumppopover")
                .style("left", d3.event.pageX)
                .style("top", (d3.event.pageY - popoverHeight / 2));
        });
    });
};
// called on page load, and on page resize
function drawZoomButtons(viewId) {

    var viewClass = ".view_" + viewId;
    if (globalVar.views[viewId].curCanvasId == "")
        return ;

    // create buttons if not existed
    if (d3.select(viewClass + ".gobackbutton").empty())
        d3.select("body")
            .append("button")
            .classed("view_" + viewId + " gobackbutton", true)
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .classed("btn-lg", true)
            .html("<span class=\"glyphicon glyphicon-arrow-left\"></span>");
    if (d3.select(viewClass + ".zoominbutton").empty())
        d3.select("body")
            .append("button")
            .classed("view_" + viewId + " zoominbutton", true)
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .classed("btn-lg", true)
            .html("<span class=\"glyphicon glyphicon-zoom-in\"></span>");
    if (d3.select(viewClass + ".zoomoutbutton").empty())
        d3.select("body")
            .append("button")
            .classed("view_" + viewId + " zoomoutbutton", true)
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .classed("btn-lg", true)
            .html("<span class=\"glyphicon glyphicon-zoom-out\"></span>");

    // get client bounding rect of view svg
    var bbox = d3.select("#containerSvg").node().getBoundingClientRect();
    var bLeft = +bbox.left + (+d3.select(viewClass + ".viewsvg").attr("x"));
    var bTop = +bbox.top + (+d3.select(viewClass + ".viewsvg").attr("y"));

    // position the buttons
    var leftMargin = 20;
    var topMargin = 20;
    var dist = 50;
    d3.select(viewClass + ".gobackbutton")
        .style("top", bTop + topMargin + "px")
        .style("left", (bLeft - leftMargin) + "px");
    d3.select(viewClass + ".zoominbutton")
        .style("top", bTop + topMargin + dist + "px")
        .style("left", (bLeft - leftMargin) + "px");
    d3.select(viewClass + ".zoomoutbutton")
        .style("top", bTop + topMargin + dist * 2 + "px")
        .style("left", (bLeft - leftMargin) + "px");
};

// called after a new canvas is completely rendered
function setButtonState(viewId) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // goback
    if (gvd.history.length > 0)
        d3.select(viewClass + ".gobackbutton")
            .attr("disabled", null)
            .on("click", function () {backspace(viewId);});
    else
        d3.select(viewClass + ".gobackbutton")
            .attr("disabled", true);

    // literal zoom buttons
    d3.select(viewClass + ".zoominbutton")
        .attr("disabled", true);
    d3.select(viewClass + ".zoomoutbutton")
        .attr("disabled", true);
    var jumps = gvd.curJump;
    for (var i = 0; i < jumps.length; i ++)
        if (jumps[i].type == "literal_zoom_in")
            d3.select(viewClass + ".zoominbutton")
                .attr("disabled", null)
                .on("click", function() {literalZoomIn(viewId);});
        else if (jumps[i].type == "literal_zoom_out")
            d3.select(viewClass + ".zoomoutbutton")
                .attr("disabled", null)
                .on("click", function() {literalZoomOut(viewId);});
};

// called in completeZoom() and RegisterJump()
// before global variables are changed
function logHistory(viewId, zoom_type) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;
    var curHistory = {"zoomType" : zoom_type};

    // save global variables
    curHistory.predicates = gvd.predicates;
    curHistory.highlightPredicates = gvd.highlightPredicates;
    curHistory.canvasId = gvd.curCanvasId;
    curHistory.canvasObj = gvd.curCanvas;
    curHistory.jumps = gvd.curJump;
    curHistory.staticData = gvd.curStaticData;

    // save current viewport
    var curViewport = [0, 0, gvd.viewportWidth, gvd.viewportHeight];
    if (d3.select(viewClass + ".mainsvg:not(.static)").size())
        curViewport = d3.select(viewClass + ".mainsvg:not(.static)").attr("viewBox").split(" ");
    curHistory.viewportX = +curViewport[0];
    curHistory.viewportY = +curViewport[1];
    curHistory.viewportW = +curViewport[2];
    curHistory.viewportH = +curViewport[3];

    gvd.history.push(curHistory);
};

// handler for go back button
function backspace(viewId) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // get and pop last history object
    var curHistory = gvd.history.pop();

    // whether this semantic zoom is also geometric
    var zoomType = curHistory.zoomType;
    var fadingAnimation = (zoomType == param.semanticZoom ? true : false);

    // disable and remove stuff
    preJump(viewId);

    // assign back global vars
    gvd.curCanvasId = curHistory.canvasId;
    gvd.curCanvas = curHistory.canvasObj;
    gvd.curJump = curHistory.jumps;
    gvd.curStaticData = curHistory.staticData;
    gvd.predicates = curHistory.predicates;
    gvd.highlightPredicates = curHistory.highlightPredicates;
    gvd.initialViewportX = curHistory.viewportX;
    gvd.initialViewportY = curHistory.viewportY;

    // get current viewport
    var curViewport = [0, 0, gvd.viewportWidth, gvd.viewportHeight];
    if (d3.select(viewClass + ".oldmainsvg:not(.static)").size())
        curViewport = d3.select(viewClass + ".oldmainsvg:not(.static)").attr("viewBox").split(" ");

    // start a exit & fade transition
    if (fadingAnimation)
        d3.transition("fadeTween_" + viewId)
            .duration(param.enteringDuration)
            .tween("fadeTween", function() {

                return function(t) {fadeAndExit(d3.easeCircleOut(1 - t));};
            })
            .on("start", startZoomingBack);
    else {
        d3.selectAll(viewClass + ".oldlayerg")
            .transition()
            .delay(param.oldRemovalDelay)
            .remove();
        startZoomingBack();
    }

    function startZoomingBack() {

        // schedule a zoom back transition
        var zoomDuration = d3.interpolateZoom(curHistory.endView, curHistory.startView).duration;
        var enteringDelay = Math.max(Math.round(zoomDuration * param.enteringDelta) + param.enteringDuration - zoomDuration,
            param.axesOutDuration);
        if (! fadingAnimation)
            enteringDelay = 0;
        d3.transition("zoomOutTween_" + viewId)
            .delay(enteringDelay)
            .duration(zoomDuration)
            .tween("zoomOutTween", function () {

                var i = d3.interpolateZoom(curHistory.endView, curHistory.startView);
                return function (t) {enterAndZoom(t, i(t));};
            })
            .on("start", function() {

                // set up layer layouts
                setupLayerLayouts(viewId);

                // static trim
                renderStaticLayers(viewId);

                // render
                RefreshDynamicLayers(viewId, gvd.initialViewportX, gvd.initialViewportY);
            })
            .on("end", function () {

                postJump(viewId);
            });
    }

    function enterAndZoom(t, v) {

        var vWidth = v[2];
        var vHeight = gvd.viewportHeight / gvd.viewportWidth * vWidth;
        var minx = gvd.initialViewportX + v[0] - vWidth / 2.0;
        var miny = gvd.initialViewportY + v[1] - vHeight / 2.0;

        // change viewBox of dynamic layers
        d3.selectAll(viewClass + ".mainsvg:not(.static)")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change viewBox of static layers
        minx = v[0] - vWidth / 2.0;
        miny = v[1] - vHeight / 2.0;
        d3.selectAll(viewClass + ".mainsvg.static")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change opacity
        if (fadingAnimation) {
            var threshold = param.fadeThreshold;
            if (1 - t >= threshold) {
                d3.selectAll(viewClass + ".mainsvg")
                    .style("opacity", 1.0 - (1 - t - threshold) / (1.0 - threshold));
            }
        }
    };

    function fadeAndExit(t) {

        var vWidth = gvd.viewportWidth * param.enteringScaleFactor
            / (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var vHeight = gvd.viewportHeight * param.enteringScaleFactor
            / (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var minx = +curViewport[0] + gvd.viewportWidth / 2.0 - vWidth / 2.0;
        var miny = +curViewport[1] + gvd.viewportHeight / 2.0 - vHeight / 2.0;

        // change viewBox of old dynamic layers
        d3.selectAll(viewClass + ".oldmainsvg:not(.static)")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change viewBox of old static layers
        minx = gvd.viewportWidth / 2 - vWidth / 2;
        miny = gvd.viewportHeight / 2 - vHeight / 2;
        d3.selectAll(viewClass + ".oldmainsvg.static")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change opacity
        d3.selectAll(viewClass + ".oldmainsvg").style("opacity", t);
    };
};

// handler for zoom in button
function literalZoomIn(viewId) {

    var gvd = globalVar.views[viewId];

    startLiteralZoomTransition(viewId, [gvd.viewportWidth / 2, gvd.viewportHeight / 2],
        gvd.maxScale, gvd.maxScale / 2 * param.literalZoomDuration);
};

// handler for zoom out button
function literalZoomOut(viewId) {

    var gvd = globalVar.views[viewId];

    startLiteralZoomTransition(viewId, [gvd.viewportWidth / 2, gvd.viewportHeight / 2],
        gvd.minScale, 1 / gvd.minScale/ 2 * param.literalZoomDuration);
};
function zoomRescale(viewId, ele) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    var bbox = ele.getBBox();
    var cx = bbox.x + (bbox.width / 2),
        cy = bbox.y + (bbox.height / 2);   // finding center of element
    var transform = d3.zoomTransform(d3.select(viewClass + ".maing").node());
    var scaleX = 1 / transform.k;
    var scaleY = 1 / transform.k;

    if (gvd.curCanvas.zoomInFactorX <= 1
        && gvd.curCanvas.zoomOutFactorX >= 1)
        scaleX = 1;
    if (gvd.curCanvas.zoomInFactorY <= 1
        && gvd.curCanvas.zoomOutFactorY >= 1)
        scaleY = 1;
    var tx = -cx * (scaleX - 1);
    var ty = -cy * (scaleY - 1);
    var translatestr = tx + ',' + ty;
    ele.setAttribute("transform","translate("
        + translatestr + ") scale("
        + scaleX + ", " + scaleY + ")");
};

// set up zoom translate & scale extent
// call zoom on maing
// reset zoom transform
// called after every jump
function setupZoom(viewId, initialScale) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // calculate minScale, maxScale
    gvd.minScale = Math.min(gvd.curCanvas.zoomOutFactorX,
        gvd.curCanvas.zoomOutFactorY, 1);
    gvd.maxScale = Math.max(gvd.curCanvas.zoomInFactorX,
        gvd.curCanvas.zoomInFactorY, 1);

    // set up zoom
    gvd.zoom = d3.zoom()
        .scaleExtent([gvd.minScale, gvd.maxScale])
        .on("zoom", function() {zoomed(viewId);});

    // set up zooms
    d3.select(viewClass + ".maing")
        .call(gvd.zoom)
        .on("wheel.zoom", null)
        .on("dblclick.zoom", function () {

            var mousePos = d3.mouse(this);
            event.preventDefault();
            event.stopImmediatePropagation();
            var finalK = (event.shiftKey ? gvd.minScale : gvd.maxScale);
            var duration = (event.shiftKey ? 1 / finalK  / 2 : finalK / 2) * param.literalZoomDuration;
            startLiteralZoomTransition(viewId, mousePos, finalK, duration);
        })
        .call(gvd.zoom.transform, d3.zoomIdentity.scale(initialScale));
};

function startLiteralZoomTransition(viewId, center, scale, duration) {

    if (1 - 1e-6 <= scale && scale <= 1 + 1e-6)
        return ;

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // remove popovers
    removePopoversSmooth(viewId);

    // disable cursor pointers, buttons and onclick listeners
    var curSelection = d3.select(viewClass + ".maing");
    d3.select(viewClass + ".viewsvg")
        .selectAll("*")
        .style("cursor", "auto")
        .on("click", null);
    d3.selectAll("button" + viewClass)
        .attr("disabled", true);
    curSelection.on(".zoom", null);

    // start transition
    gvd.animation = true;
    var initialZoomTransform = d3.zoomTransform(curSelection.node());
    d3.transition("literalTween_" + viewId)
        .duration(duration)
        .tween("literalTween", function() {
            var i = d3.interpolateNumber(1, scale);
            return function (t) {
                var curK = i(t);
                var curTX = center[0] + curK * (-center[0] + initialZoomTransform.x);
                var curTY = center[1] + curK * (-center[1] + initialZoomTransform.y);
                var curZoomTransform = d3.zoomIdentity.translate(curTX, curTY).scale(curK);
                curSelection.call(gvd.zoom.transform, curZoomTransform);
            };
        })
        .on("end", function () {
            gvd.animation = false;
        });
}

function completeZoom(viewId, zoomType, oldZoomFactorX, oldZoomFactorY) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // get the id of the canvas to zoom into
    var jumps = gvd.curJump;
    for (var i = 0; i < jumps.length; i ++)
        if (jumps[i].type == zoomType)
            gvd.curCanvasId = jumps[i].destId;

    // get new viewport coordinates
    var curViewport = d3.select(viewClass + ".mainsvg:not(.static)").attr("viewBox").split(" ");
    gvd.initialViewportX = curViewport[0] * oldZoomFactorX;
    gvd.initialViewportY = curViewport[1] * oldZoomFactorY;

    // pre animation
    preJump(viewId);

    // get the canvas object
    var gotCanvas = getCurCanvas(viewId);
    gotCanvas.then(function () {

        // render static layers
        renderStaticLayers(viewId);

        // post animation
        postJump(viewId);
    });
};

// listener function for zoom actions
function zoomed(viewId) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // no dynamic layers? return
    if (d3.select(viewClass + ".mainsvg:not(.static)").size() == 0)
        return ;

    // frequently accessed global variables
    var cWidth = gvd.curCanvas.w;
    var cHeight = gvd.curCanvas.h;
    var vWidth = gvd.viewportWidth;
    var vHeight = gvd.viewportHeight;
    var iVX = gvd.initialViewportX;
    var iVY = gvd.initialViewportY;
    var zoomInFactorX = gvd.curCanvas.zoomInFactorX;
    var zoomOutFactorX = gvd.curCanvas.zoomOutFactorX;
    var zoomInFactorY = gvd.curCanvas.zoomInFactorY;
    var zoomOutFactorY = gvd.curCanvas.zoomOutFactorY;

    // get current zoom transform
    var transform = d3.event.transform;

    // remove all popovers
    removePopovers(viewId);

    // get scale x and y
    var scaleX = transform.k;
    var scaleY = transform.k;
    if (zoomInFactorX <= 1 && zoomOutFactorX >= 1)
        scaleX = 1;
    if (zoomInFactorY <= 1 && zoomOutFactorY >= 1)
        scaleY = 1;

    // get new viewport coordinates
    var viewportX = iVX - transform.x / scaleX;
    var viewportY = iVY - transform.y / scaleY;

    // restrict panning by modifying d3 event transform, which is a bit sketchy. However,
    // d3-zoom is so under-documented that I could not use it to make single-axis literal zooms work
    if (viewportX < 0) {
        viewportX = 0;
        d3.event.transform.x = iVX * scaleX;
    }
    if (viewportX > cWidth - vWidth / scaleX) {
        viewportX = cWidth - vWidth / scaleX;
        d3.event.transform.x = (iVX - viewportX) * scaleX;
    }
    if (viewportY < 0) {
        viewportY = 0;
        d3.event.transform.y = iVY * scaleY;
    }
    if (viewportY > cHeight - vHeight / scaleY) {
        viewportY = cHeight - vHeight / scaleY;
        d3.event.transform.y = (iVY - viewportY) * scaleY;
    }

    // set viewBox size && refresh canvas
    var curViewport = d3.select(viewClass + ".mainsvg:not(.static)").attr("viewBox").split(" ");
    curViewport[2] = vWidth / scaleX;
    curViewport[3] = vHeight / scaleY;
    d3.selectAll(viewClass + ".mainsvg:not(.static)")
        .attr("viewBox", curViewport[0]
            + " " + curViewport[1]
            + " " + curViewport[2]
            + " " + curViewport[3]);

    // get data
    RefreshDynamicLayers(viewId, viewportX, viewportY);

    // check if zoom scale reaches zoomInFactor
    if ((zoomInFactorX > 1 && scaleX >= gvd.maxScale) ||
        (zoomInFactorY > 1 && scaleY >= gvd.maxScale))
        completeZoom(viewId, "literal_zoom_in", zoomInFactorX, zoomInFactorY);

    // check if zoom scale reaches zoomOutFactor
    if ((zoomOutFactorX < 1 && scaleX <= gvd.minScale) ||
        (zoomOutFactorY < 1 && scaleY <= gvd.minScale))
        completeZoom(viewId, "literal_zoom_out", zoomOutFactorX, zoomOutFactorY);
};
// setting up global variables
var globalVar = {};

// tile width and tile height
globalVar.tileW = 0;
globalVar.tileH = 0;

// cache
globalVar.cachedCanvases = {};

// global rendering params (specified by the developer)
globalVar.renderingParams = null;

// global var dictionaries for views
globalVar.views = {};

// globalVar project
globalVar.project = null;

if (typeof String.prototype.parseFunction != 'function') {
    String.prototype.parseFunction = function () {
        var funcReg = /function *[^()]*\(([^()]*)\)[ \n\t]*\{([\s\S]*)\}/gmi;
        var match = funcReg.exec(this);
        if(match)
            return new Function(match[1].split(','), match[2]);
        else
            return null;
    };
}

/****************** common functions ******************/
function getOptionalArgs(viewId) {

    var gvd = globalVar.views[viewId];
    var predicateDict = {};
    for (var i = 0; i < gvd.predicates.length; i ++)
        predicateDict["layer" + i] = gvd.predicates[i];
    var optionalArgs = {canvasW : gvd.curCanvas.w, canvasH : gvd.curCanvas.h,
        viewportW : gvd.viewportWidth, viewportH : gvd.viewportHeight,
        predicates : predicateDict, renderingParams : globalVar.renderingParams};

    return optionalArgs;
}

// get SQL predicates from a predicate dictionary
function getSqlPredicate(p) {

    if ("==" in p)
        return "(" + p["=="][0] + "=\'" + p["=="][1] + "\')";
    if ("AND" in p)
        return "(" + getSqlPredicate(p["AND"][0]) + " AND "
            + getSqlPredicate(p["AND"][1]) + ")";
    if ("OR" in p)
        return "(" + getSqlPredicate(p["OR"][0]) + " OR "
            + getSqlPredicate(p["OR"][1]) + ")";
    return "";
}

// check whether a given datum passes a filter
function isHighlighted(d, p) {

    if (p == null || p == {})
        return true;
    if ("==" in p)
        return d[p["=="][0]] == p["=="][1];
    if ("AND" in p)
        return isHighlighted(d, p["AND"][0]) && isHighlighted(d, p["AND"][1]);
    if ("OR" in p)
        return isHighlighted(d, p["OR"][0]) || isHighlighted(d, p["OR"][1]);

    return false;
}

// get a canvas object by a canvas ID
function getCanvasById(canvasId) {

    for (var i = 0; i < globalVar.project.canvases.length; i ++)
        if (globalVar.project.canvases[i].id == canvasId)
            return globalVar.project.canvases[i];

    return null;
}

// get jumps starting from a canvas
function getJumpsByCanvasId(canvasId) {

    var jumps = [];
    for (var i = 0; i < globalVar.project.jumps.length; i ++)
        if (globalVar.project.jumps[i].sourceId == canvasId)
            jumps.push(globalVar.project.jumps[i]);

    return jumps;
}
// get from backend the current canvas object assuming curCanvasId is already correctly set
function getCurCanvas(viewId) {

    var gvd = globalVar.views[viewId];

    // get all jumps starting at currrent canvas
    gvd.curJump = getJumpsByCanvasId(gvd.curCanvasId);

    // check if cache has it
    var postData = "id=" + gvd.curCanvasId;
    for (var i = 0; i < gvd.predicates.length; i ++)
        postData += "&predicate" + i + "=" + getSqlPredicate(gvd.predicates[i]);
    if (postData in globalVar.cachedCanvases)
        return new Promise(function (resolve) {

            // note that we don't directly get canvas objects from gvd.project
            // because sometimes the canvas w/h is dynamic and not set, in which
            // case we need to fetch from the backend (using gvd.predicates)
            gvd.curCanvas = globalVar.cachedCanvases[postData].canvasObj;
            gvd.curStaticData = globalVar.cachedCanvases[postData].staticData;
            setupLayerLayouts(viewId);
            resolve();
        });

    // otherwise make a non-blocked http request to the server
    return $.ajax({
        type : "POST",
        url : "canvas",
        data : postData,
        success : function (data) {
            gvd.curCanvas = JSON.parse(data).canvas;
            gvd.curStaticData = JSON.parse(data).staticData;
            setupLayerLayouts(viewId);

            // insert into cache
            if (! (postData in globalVar.cachedCanvases)) {
                globalVar.cachedCanvases[postData] = {};
                globalVar.cachedCanvases[postData].canvasObj = gvd.curCanvas;
                globalVar.cachedCanvases[postData].staticData = gvd.curStaticData;
            }
        }
    });
}

// setup <g>s and <svg>s for each layer
function setupLayerLayouts(viewId) {

    var gvd = globalVar.views[viewId];

    // number of layers
    var numLayers = gvd.curCanvas.layers.length;

    // set box flag
    if (param.fetchingScheme == "dbox") {
        gvd.boxX = [-1e5];
        gvd.boxY = [-1e5];
        gvd.boxH = [-1e5];
        gvd.boxW = [-1e5];
    }

    // set render data
    gvd.renderData = [];
    for (var i = numLayers - 1; i >= 0; i --)
        gvd.renderData.push([]);

    // create layers
    for (var i = numLayers - 1; i >= 0; i --) {
        var isStatic = gvd.curCanvas.layers[i].isStatic;
        // add new <g>
        d3.select(".view_" + viewId + ".maing")
            .append("g")
            .classed("view_" + viewId + " layerg layer" + i, true)
            .append("svg")
            .classed("view_" + viewId + " mainsvg", true)
            .classed("static", isStatic)
            .attr("width", gvd.viewportWidth)
            .attr("height", gvd.viewportHeight)
            .attr("preserveAspectRatio", "none")
            .attr("x", 0)
            .attr("y", 0)
            .attr("viewBox", (isStatic ? "0 0"
                + " " + gvd.viewportWidth
                + " " + gvd.viewportHeight
                : gvd.initialViewportX
                + " " + gvd.initialViewportY
                + " " +  gvd.viewportWidth
                + " " + gvd.viewportHeight))
            .classed("lowestsvg", (isStatic || param.fetchingScheme == "dbox"));
    }
}

// loop over rendering parameters, convert them to function if needed
function processRenderingParams() {

    for (var key in globalVar.renderingParams) {
        var curValue = globalVar.renderingParams[key];
        if (typeof curValue == "string" && curValue.parseFunction() != null)
            globalVar.renderingParams[key] = curValue.parseFunction();
    }
}

// set up page
export function pageOnLoad() {

    // get information about the first canvas to render
    $.post("/first/", {}, function (data) {
        var response = JSON.parse(data);
        globalVar.project = response.project;
        globalVar.tileW = +response.tileW;
        globalVar.tileH = +response.tileH;
        globalVar.renderingParams = JSON.parse(globalVar.project.renderingParams);
        processRenderingParams();

        // remove all jump option popovers when the window is resized
        d3.select(window).on("resize.popover", removePopovers);
        //d3.select(window).on("click", removePopovers);

        // set up container SVG
        var containerW = 0, containerH = 0;
        var viewSpecs = globalVar.project.views;
        for (var i = 0; i < viewSpecs.length; i ++) {
            containerW = Math.max(containerW, viewSpecs[i].minx + viewSpecs[i].width + param.viewPadding * 2);
            containerH = Math.max(containerH, viewSpecs[i].miny + viewSpecs[i].height + param.viewPadding * 2);
        }
        d3.select("body")
            .append("svg")
            .attr("id", "containerSvg")
            .attr("width", containerW)
            .attr("height", containerH);

        for (var i = 0; i < viewSpecs.length; i ++) {

            // get a reference for current globalvar dict
            var viewId = viewSpecs[i].id;
            globalVar.views[viewId] = {};
            var gvd = globalVar.views[viewId];

            // initial setup
            gvd.initialViewportX = viewSpecs[i].initialViewportX;
            gvd.initialViewportY = viewSpecs[i].initialViewportY;
            gvd.viewportWidth = viewSpecs[i].width;
            gvd.viewportHeight = viewSpecs[i].height;
            gvd.curCanvasId = viewSpecs[i].initialCanvasId;
            gvd.renderData = null;
            gvd.pendingBoxRequest = false;
            gvd.curCanvas = null;
            gvd.curJump = null;
            gvd.curStaticData = null;
            gvd.history = [];
            gvd.animation = false;
            gvd.predicates = [];
            gvd.highlightPredicates = [];
            if (gvd.curCanvasId != "") {
                var predDict = JSON.parse(viewSpecs[i].initialPredicates);
                var numLayer = getCanvasById(gvd.curCanvasId).layers.length;
                for (var j = 0; j < numLayer; j ++)
                    if (("layer" + j) in predDict)
                        gvd.predicates.push(predDict["layer" + j]);
                    else
                        gvd.predicates.push({});
            }

            // set up view svg
            d3.select("#containerSvg")
                .append("svg")
                .classed("view_" + viewId + " viewsvg", true)
                .attr("width", gvd.viewportWidth + param.viewPadding * 2)
                .attr("height", gvd.viewportHeight + param.viewPadding * 2)
                .attr("x", viewSpecs[i].minx)
                .attr("y", viewSpecs[i].miny)
                .append("g")
                .classed("view_" + viewId + " maing", true)
                .attr("transform", "translate("
                    + param.viewPadding
                    + ","
                    + param.viewPadding
                    + ")")
                .append("rect") // a transparent rect to receive pointer events
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", gvd.viewportWidth)
                .attr("height", gvd.viewportHeight)
                .style("opacity", 0);

            // set up axes group
            d3.select(".view_" + viewId + ".viewsvg")
                .append("g")
                .classed("view_" + viewId + " axesg", true)
                .attr("transform", "translate("
                    + param.viewPadding
                    + ","
                    + param.viewPadding
                    + ")");

            // initialize zoom buttons, must before getCurCanvas is called
            drawZoomButtons(viewId);
            d3.select(window).on("resize.zoombutton", function () {
                for (var viewId in globalVar.views)
                    drawZoomButtons(viewId);
            });

            // render this view
            if (gvd.curCanvasId != "") {
                var gotCanvas = getCurCanvas(viewId);
                gotCanvas.then((function (viewId) {

                    return function () {

                        // render static trims
                        renderStaticLayers(viewId);

                        // set up zoom
                        setupZoom(viewId, 1);

                        // set button state
                        setButtonState(viewId);
                    }
                })(viewId));
            }
        }
    });
}

//$(document).ready(pageOnLoad);
// parameters
var param = {};

// animation durations, delays
param.enteringDelta = 0.5;
param.enteringDuration = 1300;
param.literalZoomDuration = 300;
param.oldRemovalDelay = 100;

// zoom scale factor
param.zoomScaleFactor = 4;

// entering initial scale factor
param.enteringScaleFactor = 2.5;

// threshold for t when fade starts
param.fadeThreshold = 0.5;

// tile entering animation duration
param.tileEnteringDuration = 150;

// axes & static trim fading in/out duration
param.axesOutDuration = 400;
param.axesInDuration = 400;
param.staticTrimInDuration = 500;
param.staticTrimOutDuration = 500;
param.popoverOutDuration = 200;

// for coordinated highlighting - dim opacity
param.dimOpacity = 0.4;

// extra tiles per dimension
param.extraTiles = 0;

// padding for the container svg
param.viewPadding = 50;

// whether retain size when literal zooming
param.retainSizeZoom = false;

// jump types
param.semanticZoom = "semantic_zoom";
param.geometricSemanticZoom = "geometric_semantic_zoom";
param.load = "load";
param.highlight = "highlight";

// fetching scheme -- either tiling or dbox
param.fetchingScheme = "dbox";

// whether use delta box
param.deltaBox = true;
function renderStaticLayers(viewId) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // number of layers
    var numLayers = gvd.curCanvas.layers.length;

    // loop over every layer
    for (var i = numLayers - 1; i >= 0; i--) {
        // current layer object
         var curLayer = gvd.curCanvas.layers[i];

        // if this layer is not static, return
        if (! curLayer.isStatic)
            continue;

        // render
        var renderFunc = curLayer.rendering.parseFunction();
        var curSvg = d3.select(viewClass + ".layerg.layer" + i)
            .select("svg");
        renderFunc(curSvg, gvd.curStaticData[i], getOptionalArgs(viewId));

        // register jump
        if (! gvd.animation)
            registerJumps(viewId, curSvg, i);

        // highlight
        highlightLowestSvg(viewId, curSvg, i);
    }
};
