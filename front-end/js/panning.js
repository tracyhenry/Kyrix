// zoomed function for detecting pan actions
function zoomed() {

    var transform = d3.event.transform;
    var viewportX = globalVar.initialViewportX - transform.x;
    var viewportY = globalVar.initialViewportY - transform.y;

    if (viewportX < 0){
        viewportX = 0;
        d3.event.transform.x = globalVar.initialViewportX;
    }


    if (viewportX > globalVar.curCanvas.w - globalVar.viewportWidth) {
        viewportX = globalVar.curCanvas.w - globalVar.viewportWidth;
        d3.event.transform.x = globalVar.initialViewportX - globalVar.curCanvas.w + globalVar.viewportWidth;
    }

    if (viewportY < 0){
        viewportY = 0;
        d3.event.transform.y = globalVar.initialViewportY;
    }

    if (viewportY > globalVar.curCanvas.h - globalVar.viewportHeight) {
        viewportY = globalVar.curCanvas.h - globalVar.viewportHeight;
        d3.event.transform.y = globalVar.initialViewportY - globalVar.curCanvas.h + globalVar.viewportHeight;
    }

    RefreshCanvas(viewportX, viewportY);
}
