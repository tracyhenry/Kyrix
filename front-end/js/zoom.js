function zoomRescale(viewId, ele, oldGScaleX, oldGScaleY) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    var cx = d3.select(ele).datum().cx;
    var cy = d3.select(ele).datum().cy; // finding center of element
    var k = gvd.initialScale || 1;
    if (!gvd.animation)
        k = d3.zoomTransform(d3.select(viewClass + ".maing").node()).k;
    var scaleX = 1 / k;
    var scaleY = 1 / k;

    if (gvd.curCanvas.zoomInFactorX <= 1 && gvd.curCanvas.zoomOutFactorX >= 1)
        scaleX = 1;
    if (gvd.curCanvas.zoomInFactorY <= 1 && gvd.curCanvas.zoomOutFactorY >= 1)
        scaleY = 1;
    scaleX *= oldGScaleX ? oldGScaleX : 1;
    scaleY *= oldGScaleY ? oldGScaleY : 1;
    var tx = -cx * (scaleX - 1);
    var ty = -cy * (scaleY - 1);
    var translateStr = tx + "," + ty;
    d3.select(ele).attr(
        "transform",
        "translate(" + translateStr + ") scale(" + scaleX + ", " + scaleY + ")"
    );
}

// set up zoom translate & scale extent
// call zoom on maing
// reset zoom transform
// called after every jump
function setupZoom(viewId, initialScale) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // record initial scale, used to determine whether it's
    // literal zoom in or literal zoom out
    gvd.initialScale = initialScale;

    // calculate maxScale
    gvd.maxScale = Math.max(
        gvd.curCanvas.zoomInFactorX,
        gvd.curCanvas.zoomInFactorY,
        1
    );

    // set up zoom
    gvd.zoom = d3
        .zoom()
        .scaleExtent([1 - param.eps, gvd.maxScale])
        .on("zoom", function() {
            zoomed(viewId);
        });

    // set up zooms
    d3.select(viewClass + ".maing")
        .call(gvd.zoom)
        .on("dblclick.zoom", function() {
            var mousePos = d3.mouse(this);
            event.preventDefault();
            event.stopImmediatePropagation();
            var zoomFactor =
                param.literalZoomFactorPerStep * (event.shiftKey ? -1 : 1);
            startLiteralZoomTransition(
                viewId,
                mousePos,
                zoomFactor,
                param.literalZoomDuration
            );
        })
        .call(gvd.zoom.transform, d3.zoomIdentity.scale(initialScale));
}

function startLiteralZoomTransition(viewId, center, scale, duration) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;
    var curSelection = d3.select(viewClass + ".maing");

    // remove popovers
    removePopoversSmooth(viewId);

    // disable cursor pointers, buttons and onclick listeners
    var previousTick = 0;

    // start transition
    d3.transition("literalTween_" + viewId)
        .duration(duration)
        .ease(d3.easeLinear)
        .tween("literalTween", function() {
            return function(t) {
                var curZoomFactor = Math.pow(Math.abs(scale), t - previousTick);
                if (scale < 0) curZoomFactor = 1 / curZoomFactor;
                previousTick = t;
                var initialZoomTransform = d3.zoomTransform(
                    curSelection.node()
                );
                if (initialZoomTransform.k >= gvd.maxScale && scale > 0) return;
                if (initialZoomTransform.k <= 1 - param.eps && scale < 0)
                    return;
                var curK = initialZoomTransform.k * curZoomFactor;
                var curTX =
                    center[0] +
                    curZoomFactor * (-center[0] + initialZoomTransform.x);
                var curTY =
                    center[1] +
                    curZoomFactor * (-center[1] + initialZoomTransform.y);
                var curZoomTransform = d3.zoomIdentity
                    .translate(curTX, curTY)
                    .scale(curK);
                curSelection.call(gvd.zoom.transform, curZoomTransform);
            };
        });
}

function completeZoom(viewId, zoomType, oldZoomFactorX, oldZoomFactorY) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // get the id of the canvas to zoom into
    var jumps = gvd.curJump;
    var curJump = null;
    for (var i = 0; i < jumps.length; i++)
        if (jumps[i].type == zoomType) curJump = jumps[i];
    gvd.curCanvasId = curJump.destId;

    // get new viewport coordinates
    var curViewport = d3
        .select(viewClass + ".mainsvg:not(.static)")
        .attr("viewBox")
        .split(" ");
    gvd.initialViewportX = curViewport[0] * oldZoomFactorX;
    gvd.initialViewportY = curViewport[1] * oldZoomFactorY;

    // TODO (#157): we cleared predicates before literal zoom, but this isn't ideal
    var numLayer = getCanvasById(curJump.destId).layers.length;
    gvd.predicates = [];
    for (var i = 0; i < numLayer; i++) gvd.predicates.push({});

    // pre animation
    preJump(viewId, curJump);

    // get the canvas object
    var gotCanvas = getCurCanvas(viewId);
    gotCanvas.then(function() {
        // render static layers
        renderStaticLayers(viewId);

        // post animation
        postJump(viewId, curJump);
    });
}

// listener function for zoom actions
function zoomed(viewId) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // no dynamic layers? return
    if (d3.select(viewClass + ".mainsvg:not(.static)").size() == 0) return;

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
    if (zoomInFactorX <= 1 && zoomOutFactorX >= 1) scaleX = 1;
    if (zoomInFactorY <= 1 && zoomOutFactorY >= 1) scaleY = 1;

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

    // set viewBox
    var curViewport = d3
        .select(viewClass + ".mainsvg:not(.static)")
        .attr("viewBox")
        .split(" ");
    d3.selectAll(viewClass + ".mainsvg:not(.static)").attr(
        "viewBox",
        viewportX +
            " " +
            viewportY +
            " " +
            vWidth / scaleX +
            " " +
            vHeight / scaleY
    );

    // set viewboxes old layer groups
    var jumps = gvd.curJump;
    var zoomType =
        gvd.initialScale == 1 ? param.literalZoomOut : param.literalZoomIn;
    var oldCanvasId = "";
    for (var i = 0; i < jumps.length; i++)
        if (jumps[i].type == zoomType) oldCanvasId = jumps[i].destId;
    if (
        !d3.selectAll(viewClass + ".oldmainsvg:not(.static)").empty() &&
        oldCanvasId != ""
    ) {
        var oldViewportX =
            viewportX *
            (gvd.initialScale == 1 ? zoomOutFactorX : zoomInFactorX);
        var oldViewportY =
            viewportY *
            (gvd.initialScale == 1 ? zoomOutFactorY : zoomInFactorY);
        var oldViewportW =
            vWidth /
            (scaleX / (gvd.initialScale == 1 ? zoomOutFactorX : zoomInFactorX));
        var oldViewportH =
            vHeight /
            (scaleY / (gvd.initialScale == 1 ? zoomOutFactorY : zoomInFactorY));
        d3.selectAll(viewClass + ".oldmainsvg:not(.static)").attr(
            "viewBox",
            oldViewportX +
                " " +
                oldViewportY +
                " " +
                oldViewportW +
                " " +
                oldViewportH
        );
    }

    // check if there is literal zooming going on
    // if yes, rescale the objects
    // do it both here and upon data return
    var isZooming =
        Math.abs(vWidth / scaleX - curViewport[2]) > param.eps ||
        Math.abs(vHeight / scaleY - curViewport[3]) > param.eps;
    if (isZooming) {
        d3.selectAll(viewClass + ".layerg")
            .selectAll(".kyrix-retainsizezoom")
            .each(function() {
                zoomRescale(viewId, this);
            });

        // for old layer groups
        if (oldCanvasId != "") {
            // proceed when it's indeed literal zoom (otherwise can only be geometric semantic zoom)
            d3.selectAll(viewClass + ".oldlayerg")
                .selectAll(".kyrix-retainsizezoom")
                .each(function() {
                    zoomRescale(
                        viewId,
                        this,
                        gvd.initialScale == 1 ? zoomOutFactorX : zoomInFactorX,
                        gvd.initialScale == 1 ? zoomOutFactorY : zoomInFactorY
                    );
                });
        }
    }

    // set literal zoom button state
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
    if (scaleX > 1 || scaleY > 1)
        d3.select(viewClass + ".zoomoutbutton")
            .attr("disabled", null)
            .on("click", function() {
                literalZoomOut(viewId);
            });

    // get data
    RefreshDynamicLayers(viewId, viewportX, viewportY);

    // check if zoom scale reaches zoomInFactor
    if (
        (zoomInFactorX > 1 && scaleX >= gvd.maxScale) ||
        (zoomInFactorY > 1 && scaleY >= gvd.maxScale)
    )
        completeZoom(viewId, param.literalZoomIn, zoomInFactorX, zoomInFactorY);

    // check if zoom scale reaches zoomOutFactor
    if (
        (zoomOutFactorX < 1 && scaleX <= 1 - param.eps) ||
        (zoomOutFactorY < 1 && scaleY <= 1 - param.eps)
    )
        completeZoom(
            viewId,
            param.literalZoomOut,
            zoomOutFactorX,
            zoomOutFactorY
        );

    // execute onPan & onZoom handlers
    if (!isZooming && gvd.onPanHandlers != null) {
        var subEvts = Object.keys(gvd.onPanHandlers);
        for (var subEvt of subEvts)
            if (typeof gvd.onPanHandlers[subEvt] == "function")
                gvd.onPanHandlers[subEvt]();
    }
    if (isZooming && gvd.onZoomHandlers != null) {
        var subEvts = Object.keys(gvd.onZoomHandlers);
        for (var subEvt of subEvts)
            if (typeof gvd.onZoomHandlers[subEvt] == "function")
                gvd.onZoomHandlers[subEvt]();
    }
}
