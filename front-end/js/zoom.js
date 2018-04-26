// set up zoom translate & scale extent
// call zoom on container svg
// reset zoom transform
// called after every jump
function setupZoom() {

    // set up zoom
    var zoom = d3.zoom()
        .scaleExtent([1, 1])
        .on("zoom", zoomed)
        .translateExtent(
            [[-globalVar.initialViewportX, -globalVar.initialViewportY],
                [globalVar.curCanvas.w - globalVar.initialViewportX,
                    globalVar.curCanvas.h - globalVar.initialViewportY]]
        );

    // set up zooms
    globalVar.containerSvg.call(zoom)
        .call(zoom.transform, d3.zoomIdentity);
}

// zoomed function for detecting pan actions
function zoomed() {

    var transform = d3.event.transform;
    var viewportX = globalVar.initialViewportX - transform.x;
    var viewportY = globalVar.initialViewportY - transform.y;

    RefreshCanvas(viewportX, viewportY);
};
