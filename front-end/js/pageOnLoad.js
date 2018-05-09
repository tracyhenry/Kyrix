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
        globalVar.initialViewportX = +response.initialViewportX;
        globalVar.initialViewportY = +response.initialViewportY;
        globalVar.predicates = response.initialPredicates;
        globalVar.viewportWidth = +response.viewportWidth;
        globalVar.viewportHeight = +response.viewportHeight;
        globalVar.curCanvasId = response.initialCanvasId;
        globalVar.tileW = +response.tileW;
        globalVar.tileH = +response.tileH;

        // set up global and main svgs
        d3.select("body")
            .append("svg")
            .attr("id", "containerSvg")
            .attr("width", globalVar.viewportWidth + param.containerPadding * 2)
            .attr("height", globalVar.viewportHeight + param.containerPadding * 2)
            .append("g")
            .attr("id", "maing")
            .attr("transform", "translate("
                + param.containerPadding
                + ","
                + param.containerPadding
                + ")")
            .append("rect") // a transparent rect to receive pointer events
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", globalVar.viewportWidth)
            .attr("height", globalVar.viewportHeight)
            .style("opacity", 0);

        d3.select("#maing")
            .append("svg")
            .attr("id", "mainSvg")
            .attr("width", globalVar.viewportWidth)
            .attr("height", globalVar.viewportHeight)
            .attr("preserveAspectRatio", "none")
            .attr("x", 0)
            .attr("y", 0)
            .attr("viewBox", globalVar.initialViewportX
                + " " + globalVar.initialViewportY
                + " " +  globalVar.viewportWidth
                + " " + globalVar.viewportHeight);

        // set up axes group
        d3.select("#containerSvg")
            .append("g")
            .attr("id", "axesg")
            .attr("transform", "translate("
                + param.containerPadding
                + ","
                + param.containerPadding
                + ")");

        // get current canvas object
        getCurCanvas();

        // render static trims
        renderStaticTrim();

        // render
        RefreshCanvas(globalVar.initialViewportX,
            globalVar.initialViewportY);

        // set up zoom
        setupZoom(1);
    });
};

$(document).ready(pageOnLoad);
