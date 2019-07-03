// called on page load, and on page resize
function drawZoomButtons(viewId) {
    var viewClass = ".view_" + viewId;
    if (globalVar.views[viewId].curCanvasId == "") return;

    // create buttons if not existed
    if (d3.select(viewClass + ".gobackbutton").empty())
        d3.select(".kyrixdiv")
            .append("button")
            .classed("view_" + viewId + " gobackbutton", true)
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .classed("btn-lg", true)
            .html('<span class="glyphicon glyphicon-arrow-left"></span>');
    if (d3.select(viewClass + ".zoominbutton").empty())
        d3.select(".kyrixdiv")
            .append("button")
            .classed("view_" + viewId + " zoominbutton", true)
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .classed("btn-lg", true)
            .html('<span class="glyphicon glyphicon-zoom-in"></span>');
    if (d3.select(viewClass + ".zoomoutbutton").empty())
        d3.select(".kyrixdiv")
            .append("button")
            .classed("view_" + viewId + " zoomoutbutton", true)
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .classed("btn-lg", true)
            .html('<span class="glyphicon glyphicon-zoom-out"></span>');

    // get client bounding rect of view svg
    var bbox = d3
        .select("#containerSvg")
        .node()
        .getBoundingClientRect();
    var bLeft = +bbox.left + +d3.select(viewClass + ".viewsvg").attr("x");
    var bTop = +bbox.top + +d3.select(viewClass + ".viewsvg").attr("y");

    // position the buttons
    var leftMargin = 20;
    var topMargin = 20;
    var dist = 50;
    d3.select(viewClass + ".gobackbutton")
        .style("top", bTop + topMargin + "px")
        .style("left", bLeft - leftMargin + "px");
    d3.select(viewClass + ".zoominbutton")
        .style("top", bTop + topMargin + dist + "px")
        .style("left", bLeft - leftMargin + "px");
    d3.select(viewClass + ".zoomoutbutton")
        .style("top", bTop + topMargin + dist * 2 + "px")
        .style("left", bLeft - leftMargin + "px");
}

// called after a new canvas is completely rendered
function setButtonState(viewId) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // goback
    if (gvd.history.length > 0)
        d3.select(viewClass + ".gobackbutton")
            .attr("disabled", null)
            .on("click", function() {
                backspace(viewId);
            });
    else d3.select(viewClass + ".gobackbutton").attr("disabled", true);

    // literal zoom buttons
    d3.select(viewClass + ".zoominbutton").attr("disabled", true);
    d3.select(viewClass + ".zoomoutbutton").attr("disabled", true);
    var jumps = gvd.curJump;
    for (var i = 0; i < jumps.length; i++)
        if (jumps[i].type == "literal_zoom_in")
            d3.select(viewClass + ".zoominbutton")
                .attr("disabled", null)
                .on("click", function() {
                    literalZoomIn(viewId);
                });
        else if (jumps[i].type == "literal_zoom_out")
            d3.select(viewClass + ".zoomoutbutton")
                .attr("disabled", null)
                .on("click", function() {
                    literalZoomOut(viewId);
                });
}

// called in completeZoom() and RegisterJump()
// before global variables are changed
function logHistory(viewId, zoom_type) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;
    var curHistory = {zoomType: zoom_type};

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
        curViewport = d3
            .select(viewClass + ".mainsvg:not(.static)")
            .attr("viewBox")
            .split(" ");
    curHistory.viewportX = +curViewport[0];
    curHistory.viewportY = +curViewport[1];
    curHistory.viewportW = +curViewport[2];
    curHistory.viewportH = +curViewport[3];

    gvd.history.push(curHistory);
}

// handler for go back button
function backspace(viewId) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // get and pop last history object
    var curHistory = gvd.history.pop();

    // whether this semantic zoom is also geometric
    var zoomType = curHistory.zoomType;
    var fadingAnimation = zoomType == param.semanticZoom ? true : false;

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
        curViewport = d3
            .select(viewClass + ".oldmainsvg:not(.static)")
            .attr("viewBox")
            .split(" ");

    // start a exit & fade transition
    if (fadingAnimation)
        d3.transition("fadeTween_" + viewId)
            .duration(param.semanticZoomEnteringDuration)
            .tween("fadeTween", function() {
                return function(t) {
                    fadeAndExit(d3.easeCircleOut(1 - t));
                };
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
        var zoomDuration = d3.interpolateZoom(
            curHistory.endView,
            curHistory.startView
        ).duration;
        var enteringDelay = Math.max(
            Math.round(zoomDuration * param.semanticZoomEnteringDelta) +
                param.semanticZoomEnteringDuration -
                zoomDuration,
            param.axesOutDuration
        );
        if (!fadingAnimation) enteringDelay = 0;
        d3.transition("zoomOutTween_" + viewId)
            .delay(enteringDelay)
            .duration(zoomDuration)
            .tween("zoomOutTween", function() {
                var i = d3.interpolateZoom(
                    curHistory.endView,
                    curHistory.startView
                );
                return function(t) {
                    enterAndZoom(t, i(t));
                };
            })
            .on("start", function() {
                // set up layer layouts
                setupLayerLayouts(viewId);

                // static trim
                renderStaticLayers(viewId);

                // render
                RefreshDynamicLayers(
                    viewId,
                    gvd.initialViewportX,
                    gvd.initialViewportY
                );
            })
            .on("end", function() {
                postJump(viewId);
            });
    }

    function enterAndZoom(t, v) {
        var vWidth = v[2];
        var vHeight = (gvd.viewportHeight / gvd.viewportWidth) * vWidth;
        var minx = gvd.initialViewportX + v[0] - vWidth / 2.0;
        var miny = gvd.initialViewportY + v[1] - vHeight / 2.0;

        // change viewBox of dynamic layers
        d3.selectAll(viewClass + ".mainsvg:not(.static)").attr(
            "viewBox",
            minx + " " + miny + " " + vWidth + " " + vHeight
        );

        // change viewBox of static layers
        minx = v[0] - vWidth / 2.0;
        miny = v[1] - vHeight / 2.0;
        d3.selectAll(viewClass + ".mainsvg.static").attr(
            "viewBox",
            minx + " " + miny + " " + vWidth + " " + vHeight
        );

        // change opacity
        if (fadingAnimation) {
            var threshold = param.fadeThreshold;
            if (1 - t >= threshold) {
                d3.selectAll(viewClass + ".mainsvg").style(
                    "opacity",
                    1.0 - (1 - t - threshold) / (1.0 - threshold)
                );
            }
        }
    }

    function fadeAndExit(t) {
        var vWidth =
            (gvd.viewportWidth * param.enteringScaleFactor) /
            (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var vHeight =
            (gvd.viewportHeight * param.enteringScaleFactor) /
            (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var minx = +curViewport[0] + gvd.viewportWidth / 2.0 - vWidth / 2.0;
        var miny = +curViewport[1] + gvd.viewportHeight / 2.0 - vHeight / 2.0;

        // change viewBox of old dynamic layers
        d3.selectAll(viewClass + ".oldmainsvg:not(.static)").attr(
            "viewBox",
            minx + " " + miny + " " + vWidth + " " + vHeight
        );

        // change viewBox of old static layers
        minx = gvd.viewportWidth / 2 - vWidth / 2;
        miny = gvd.viewportHeight / 2 - vHeight / 2;
        d3.selectAll(viewClass + ".oldmainsvg.static").attr(
            "viewBox",
            minx + " " + miny + " " + vWidth + " " + vHeight
        );

        // change opacity
        d3.selectAll(viewClass + ".oldmainsvg").style("opacity", t);
    }
}

// handler for zoom in button
function literalZoomIn(viewId) {
    var gvd = globalVar.views[viewId];

    startLiteralZoomTransition(
        viewId,
        [gvd.viewportWidth / 2, gvd.viewportHeight / 2],
        param.literalZoomFactorPerStep,
        param.literalZoomDuration
    );
}

// handler for zoom out button
function literalZoomOut(viewId) {
    var gvd = globalVar.views[viewId];

    startLiteralZoomTransition(
        viewId,
        [gvd.viewportWidth / 2, gvd.viewportHeight / 2],
        -param.literalZoomFactorPerStep,
        param.literalZoomDuration
    );
}
