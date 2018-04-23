// zoomed function for detecting pan actions
function zoomed() {

    var transform = d3.event.transform;
    var viewportX = globalVar.initialViewportX - transform.x;
    var viewportY = globalVar.initialViewportY - transform.y;

    RefreshCanvas(viewportX, viewportY);
};
