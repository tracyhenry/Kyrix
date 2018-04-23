// get from backend the current canvas object assuming curCanvasId is already correctly set
function getCurCanvas() {

    // TODO: client cache
    $.ajax({
        type : "POST",
        url : "canvas",
        data : globalVar.curCanvasId,
        success : function (data, status) {
            globalVar.curCanvas = JSON.parse(data).canvas;
            globalVar.curJump = JSON.parse(data).jump;
        },
        async : false
    });
}

// get information about the first canvas to render
function pageOnLoad() {

    // send the first request to backend server
    $.post("/first/", {}, function (data, status) {
        var response = JSON.parse(data);
        console.log(response);
        globalVar.initialViewportX = parseFloat(response.initialViewportX);
        globalVar.initialViewportY = parseFloat(response.initialViewportY);
        globalVar.predicates = response.initialPredicates;
        globalVar.viewportWidth = parseFloat(response.viewportWidth);
        globalVar.viewportHeight = parseFloat(response.viewportHeight);
        globalVar.curCanvasId = response.initialCanvasId;
        globalVar.tileW = parseFloat(response.tileW);
        globalVar.tileH = parseFloat(response.tileH);

        // get current canvas object
        getCurCanvas();

        // set up zoom
        var zoom = d3.zoom()
            .scaleExtent([1, 1])
            .on("zoom", zoomed)
            .translateExtent(
            [[-globalVar.initialViewportX, -globalVar.initialViewportY],
             [globalVar.curCanvas.w - globalVar.initialViewportX,
                 globalVar.curCanvas.h - globalVar.initialViewportY]]
        );

        // set up container svg
        globalVar.containerSvg
            .attr("width", globalVar.viewportWidth)
            .attr("height", globalVar.viewportHeight)
            .call(zoom)
            .append("svg")
            .attr("id", "mainSvg")
            .attr("width", globalVar.viewportWidth)
            .attr("height", globalVar.viewportHeight)
            .attr("x", 0)
            .attr("y", 0)
            .attr("viewBox", "0 0 " + globalVar.viewportWidth
                + " " + globalVar.viewportHeight);
        globalVar.containerSvg.call(zoom.transform, d3.zoomIdentity);

        // initialize jump options
        globalVar.jumpOptions.html("");

        // render
        RefreshCanvas(globalVar.initialViewportX,
            globalVar.initialViewportY);
    });
};

$(document).ready(pageOnLoad);
