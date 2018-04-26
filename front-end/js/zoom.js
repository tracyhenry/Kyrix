// set up zoom translate & scale extent
// call zoom on container svg
// reset zoom transform
// called after every jump
function setupZoom() {

    // check if this canvas has literal zooms
    var maxScale = 1;
    if ("zoomFactor" in globalVar.curCanvas)
        maxScale = +globalVar.curCanvas.zoomFactor;

    // set up zoom
    var zoom = d3.zoom()
        .scaleExtent([1, maxScale])
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
};
