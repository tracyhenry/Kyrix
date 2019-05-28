function zoomRescale(viewId, ele) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    var cx = d3.select(ele).datum().cx;
        cy = d3.select(ele).datum().cy;   // finding center of element
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
    d3.select(ele).attr("transform","translate("
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

    // call onPan & onZoom handlers
    if (gvd.onPanHandler != null && typeof gvd.onPanHandler == "function")
        gvd.onPanHandler();
};
