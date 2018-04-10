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
        globalVar.initialViewportX = response.initialViewportX;
        globalVar.initialViewportY = response.initialViewportY;
        globalVar.predicates = response.initialPredicates;
        globalVar.viewportWidth = response.viewportWidth;
        globalVar.viewportHeight = response.viewportHeight;
        globalVar.curCanvasId = response.initialCanvasId;
        globalVar.tileW = response.tileW;
        globalVar.tileH = response.tileH;
        globalVar.containerSvg = d3.select("body").append("svg")
            .attr("width", globalVar.viewportWidth)
            .attr("height", globalVar.viewportHeight);
        globalVar.svg = globalVar.containerSvg.append("svg")
            .attr("width", globalVar.viewportWidth)
            .attr("height", globalVar.viewportHeight)
            .attr("x", 0)
            .attr("y", 0);

        globalVar.containerSvg.call(globalVar.zoom);
        getCurCanvas();
        globalVar.jumpOptions.node().innerHTML = '';
        RefreshCanvas(globalVar.initialViewportX,
            globalVar.initialViewportY);
    });
};

$(document).ready(pageOnLoad);
