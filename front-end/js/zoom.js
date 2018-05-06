// set up zoom translate & scale extent
// call zoom on container svg
// reset zoom transform
// called after every jump
function setupZoom() {

    // calculate minScale, maxScale
    var minScale = Math.min(globalVar.curCanvas.zoomOutFactorX,
        globalVar.curCanvas.zoomOutFactorY, 1);
    var maxScale = Math.max(globalVar.curCanvas.zoomInFactorX,
        globalVar.curCanvas.zoomInFactorY, 1);

    // set up zoom
    var zoom = d3.zoom()
        .scaleExtent([minScale, maxScale])
        .on("zoom", zoomed);

    // set up zooms
    d3.select("#maing").call(zoom)
        .call(zoom.transform, d3.zoomIdentity);
};

function completeZoom(zoomType, oldZoomFactorX, oldZoomFactorY) {

    // get the id of the canvas to zoom into
    var jumps = globalVar.curJump;
    for (var i = 0; i < jumps.length; i ++)
        if (jumps[i].type == zoomType)
            globalVar.curCanvasId = jumps[i].destId;

    // get the canvas object
    getCurCanvas();

    // render static trim
    renderStaticTrim();

    // get new viewport coordinates
    var curViewport = d3.select("#mainSvg").attr("viewBox").split(" ");
    curViewport[0] = curViewport[0] * oldZoomFactorX;
    curViewport[1] = curViewport[1] * oldZoomFactorY;
    curViewport[2] = globalVar.viewportWidth;
    curViewport[3] = globalVar.viewportHeight;
    d3.select("#mainSvg")
        .attr("viewBox", curViewport[0]
        + " " + curViewport[1]
        + " " + curViewport[2]
        + " " + curViewport[3]);
    globalVar.initialViewportX = curViewport[0];
    globalVar.initialViewportY = curViewport[1];

    // refreshcanvas
    RefreshCanvas(curViewport[0], curViewport[1]);

    // set up zoom
    setupZoom();

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
    var curViewport = d3.select("#mainSvg").attr("viewBox").split(" ");
    curViewport[2] = vWidth / scaleX;
    curViewport[3] = vHeight/ scaleY;
    d3.select("#mainSvg")
        .attr("viewBox", curViewport[0]
            + " " + curViewport[1]
            + " " + curViewport[2]
            + " " + curViewport[3]);
    RefreshCanvas(viewportX, viewportY);

    // check if zoom scale reaches zoomInFactor
    if ((zoomInFactorX > 1 && scaleX >= zoomInFactorX - 1e-5) ||
        (zoomInFactorY > 1 && scaleY >= zoomInFactorY - 1e-5))
        completeZoom("literal_zoom_in", zoomInFactorX, zoomInFactorY);

    // check if zoom scale reaches zoomOutFactor
    if ((zoomOutFactorX < 1 && scaleX <= zoomOutFactorX + 1e-5) ||
        (zoomOutFactorY < 1 && scaleY <= zoomOutFactorY + 1e-5))
        completeZoom("literal_zoom_out", zoomOutFactorX, zoomOutFactorY);
};
