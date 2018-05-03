// set up zoom translate & scale extent
// call zoom on container svg
// reset zoom transform
// called after every jump
function setupZoom() {

    // check if this canvas has literal zooms
    var minScale = Math.min(globalVar.curCanvas.zoomOutFactor, 1);
    var maxScale = Math.max(globalVar.curCanvas.zoomInFactor, 1);

    // set up zoom
    var zoom = d3.zoom()
        .extent([[0, 0], [globalVar.viewportWidth, globalVar.viewportHeight]])
        .scaleExtent([minScale, maxScale])
        .translateExtent(
            [[-globalVar.initialViewportX, -globalVar.initialViewportY],
                [globalVar.curCanvas.w - globalVar.initialViewportX,
                    globalVar.curCanvas.h - globalVar.initialViewportY]]
        )
        .on("zoom", zoomed);

    // set up zooms
    d3.select("#maing").call(zoom)
        .call(zoom.transform, d3.zoomIdentity);
}

function completeZoom(zoomType, oldZoomFactor) {

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
    curViewport[0] = curViewport[0] * oldZoomFactor;
    curViewport[1] = curViewport[1] * oldZoomFactor;
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

    // clear the jump option div
    globalVar.jumpOptions.html("");
}

// zoomed function for detecting pan actions
function zoomed() {

    var transform = d3.event.transform;

    // get new viewport coordinates
    var viewportX = globalVar.initialViewportX - transform.x / transform.k;
    var viewportY = globalVar.initialViewportY - transform.y / transform.k;

    // set viewBox size
    var curViewport = d3.select("#mainSvg").attr("viewBox").split(" ");
    curViewport[2] = globalVar.viewportWidth / transform.k;
    curViewport[3] = globalVar.viewportHeight / transform.k;
    d3.select("#mainSvg")
        .attr("viewBox", curViewport[0]
            + " " + curViewport[1]
            + " " + curViewport[2]
            + " " + curViewport[3]);

    RefreshCanvas(viewportX, viewportY);

    // check if zoom scale reaches zoomInFactor
    if (globalVar.curCanvas.zoomInFactor > 1
        && transform.k >= globalVar.curCanvas.zoomInFactor - 1e-5)
        completeZoom("literal_zoom_in", globalVar.curCanvas.zoomInFactor);

    // check if zoom scale reaches zoomOutFactor
    if (globalVar.curCanvas.zoomOutFactor < 1
        && transform.k <= globalVar.curCanvas.zoomOutFactor + 1e-5)
        completeZoom("literal_zoom_out", globalVar.curCanvas.zoomOutFactor);
}
