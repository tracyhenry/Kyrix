function zoomRescale() {

    var bbox = this.getBBox();
    var cx = bbox.x + (bbox.width / 2),
        cy = bbox.y + (bbox.height / 2);   // finding center of element
    var transform = d3.zoomTransform(d3.select("#maing").node());
    var scaleX = 1 / transform.k;
    var scaleY = 1 / transform.k;

    if (globalVar.curCanvas.zoomInFactorX <= 1
        && globalVar.curCanvas.zoomOutFactorX >= 1)
        scaleX = 1;
    if (globalVar.curCanvas.zoomInFactorY <= 1
        && globalVar.curCanvas.zoomOutFactorY >= 1)
        scaleY = 1;
    var tx = -cx * (scaleX - 1);
    var ty = -cy * (scaleY - 1);
    var translatestr = tx + ',' + ty;
    this.setAttribute("transform","translate("
        + translatestr + ") scale("
        + scaleX + ", " + scaleY + ")");
};

// set up zoom translate & scale extent
// call zoom on container svg
// reset zoom transform
// called after every jump
function setupZoom(initialScale) {

    // calculate minScale, maxScale
    globalVar.minScale = Math.min(globalVar.curCanvas.zoomOutFactorX,
        globalVar.curCanvas.zoomOutFactorY, 1);
    globalVar.maxScale = Math.max(globalVar.curCanvas.zoomInFactorX,
        globalVar.curCanvas.zoomInFactorY, 1);

    // set up zoom
    var zoom = d3.zoom()
        .scaleExtent([globalVar.minScale, globalVar.maxScale])
        .on("zoom", zoomed);

    // set up zooms
    d3.select("#maing").call(zoom)
        .on("wheel.zoom", null)
        .on("dblclick.zoom", function () {

            var initialZoomTransform = this.__zoom;
            var mousePos = d3.mouse(this);
            event.preventDefault();
            event.stopImmediatePropagation();
            var finalK = (event.shiftKey ? globalVar.minScale : globalVar.maxScale);
            var duration = (event.shiftKey ? 1 / finalK  / 2 : finalK / 2) * param.literalZoomDuration;
            d3.select(this)
                .transition()
                .duration(duration)
                .tween("literalTween", function() {
                    var i = d3.interpolateNumber(1, finalK);
                    return function (t) {
                        var curK = i(t);
                        var curTX = mousePos[0] + curK * (-mousePos[0] + initialZoomTransform.x);
                        var curTY = mousePos[1] + curK * (-mousePos[1] + initialZoomTransform.y);
                        var curZoomTransform = d3.zoomIdentity.translate(curTX, curTY).scale(curK);
                        d3.select(this).call(zoom.transform, curZoomTransform);
                    };
                });
        })
        .call(zoom.transform, d3.zoomIdentity.scale(initialScale));
};

function completeZoom(zoomType, oldZoomFactorX, oldZoomFactorY) {

    // get the id of the canvas to zoom into
    var jumps = globalVar.curJump;
    for (var i = 0; i < jumps.length; i ++)
        if (jumps[i].type == zoomType)
            globalVar.curCanvasId = jumps[i].destId;

    // get new viewport coordinates
    var curViewport = d3.select(".mainsvg:not(.static)").attr("viewBox").split(" ");
    globalVar.initialViewportX = curViewport[0] * oldZoomFactorX;
    globalVar.initialViewportY = curViewport[1] * oldZoomFactorY;

    // get the canvas object
    getCurCanvas();

    // render static layers
    renderStaticLayers();

    // set up zoom
    setupZoom(1);

    // set up button states
    setButtonState();

    // remove all popovers
    removePopovers();
};

// zoomed function for detecting zoom actions
function zoomed() {

    // frequently accessed global variables
    var cWidth = globalVar.curCanvas.w;
    var cHeight = globalVar.curCanvas.h;
    var vWidth = globalVar.viewportWidth;
    var vHeight = globalVar.viewportHeight;
    var iVX = globalVar.initialViewportX;
    var iVY = globalVar.initialViewportY;
    var zoomInFactorX = globalVar.curCanvas.zoomInFactorX;
    var zoomOutFactorX = globalVar.curCanvas.zoomOutFactorX;
    var zoomInFactorY = globalVar.curCanvas.zoomInFactorY;
    var zoomOutFactorY = globalVar.curCanvas.zoomOutFactorY;

    // get current zoom transform
    var transform = d3.event.transform;

    // remove all popovers
    removePopovers();

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
    var curViewport = d3.select(".mainsvg:not(.static)").attr("viewBox").split(" ");
    curViewport[2] = vWidth / scaleX;
    curViewport[3] = vHeight / scaleY;
    d3.selectAll(".mainsvg:not(.static)")
        .attr("viewBox", curViewport[0]
            + " " + curViewport[1]
            + " " + curViewport[2]
            + " " + curViewport[3]);
    RefreshDynamicLayers(viewportX, viewportY);

    // check if zoom scale reaches zoomInFactor
    if ((zoomInFactorX > 1 && scaleX >= globalVar.maxScale) ||
        (zoomInFactorY > 1 && scaleY >= globalVar.maxScale))
        completeZoom("literal_zoom_in", zoomInFactorX, zoomInFactorY);

    // check if zoom scale reaches zoomOutFactor
    if ((zoomOutFactorX < 1 && scaleX <= globalVar.minScale) ||
        (zoomOutFactorY < 1 && scaleY <= globalVar.minScale))
        completeZoom("literal_zoom_out", zoomOutFactorX, zoomOutFactorY);
};
