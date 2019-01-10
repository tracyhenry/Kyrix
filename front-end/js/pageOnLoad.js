// get from backend the current canvas object assuming curCanvasId is already correctly set
function getCurCanvas() {

    var postData = "id=" + globalVar.curCanvasId;
    for (var i = 0; i < globalVar.predicates.length; i ++)
        postData += "&predicate" + i + "=" + globalVar.predicates[i];

    // check if cache has it
    if (postData in globalVar.cachedCanvases) {
        globalVar.curCanvas = globalVar.cachedCanvases[postData].canvasObj;
        globalVar.curJump = globalVar.cachedCanvases[postData].jumps;
        globalVar.curStaticData = globalVar.cachedCanvases[postData].staticData;
        setupLayerLayouts();
        return ;
    }

    // otherwise make a blocked http request to the server
    $.ajax({
        type : "POST",
        url : "canvas",
        data : postData,
        success : function (data, status) {
            globalVar.curCanvas = JSON.parse(data).canvas;
            globalVar.curJump = JSON.parse(data).jump;
            globalVar.curStaticData = JSON.parse(data).staticData;
            setupLayerLayouts();

            // insert into cache
            if (! (postData in globalVar.cachedCanvases)) {
                globalVar.cachedCanvases[postData] = {};
                globalVar.cachedCanvases[postData].canvasObj = globalVar.curCanvas;
                globalVar.cachedCanvases[postData].jumps = globalVar.curJump;
                globalVar.cachedCanvases[postData].staticData = globalVar.curStaticData;
            }
        },
        async : false
    });
}

// setup <g>s and <svg>s for each layer
function setupLayerLayouts() {

    // number of layers
    var numLayers = globalVar.curCanvas.layers.length;

    // remove existing layers
    d3.selectAll(".layerg").remove();

    // set box flag
    if (param.fetchingScheme == "dbox") {
        globalVar.boxX = [-1e5];
        globalVar.boxY = [-1e5];
        globalVar.boxH = [-1e5];
        globalVar.boxW = [-1e5];
    }

    // set render data
    globalVar.renderData = [];
    for (var i = numLayers - 1; i >= 0; i --)
        globalVar.renderData.push([]);

    for (var i = numLayers - 1; i >= 0; i --) {
        var isStatic = globalVar.curCanvas.layers[i].isStatic;
        // add new <g>
        d3.select("#maing")
            .append("g")
            .classed("layerg", true)
            .classed("layer" + i, true)
            .append("svg")
            .classed("mainsvg", true)
            .classed("static", isStatic)
            .attr("width", globalVar.viewportWidth)
            .attr("height", globalVar.viewportHeight)
            .attr("preserveAspectRatio", "none")
            .attr("x", 0)
            .attr("y", 0)
            .attr("viewBox", (isStatic ? "0 0"
                + " " + globalVar.viewportWidth
                + " " + globalVar.viewportHeight
                : globalVar.initialViewportX
                + " " + globalVar.initialViewportY
                + " " +  globalVar.viewportWidth
                + " " + globalVar.viewportHeight));
    }
}

// loop over rendering parameters, convert them to function if needed
function processRenderingParams() {

    for (var key in globalVar.renderingParams) {
        var curValue = globalVar.renderingParams[key];
        if (typeof curValue == "string" && curValue.parseFunction() != null)
            globalVar.renderingParams[key] = curValue.parseFunction();
    }
}

// set up page
function pageOnLoad() {

    // get information about the first canvas to render
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
        globalVar.renderingParams = JSON.parse(response.renderingParams);

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

        // set up axes group
        d3.select("#containerSvg")
            .append("g")
            .attr("id", "axesg")
            .attr("transform", "translate("
                + param.containerPadding
                + ","
                + param.containerPadding
                + ")");

        // initialize zoom buttons, must before getCurCanvas is called
        drawZoomButtons();
        d3.select(window).on("resize.zoombutton", drawZoomButtons);

        // remove jump option popovers when body is clicked or resized
        d3.select(window).on("resize.popover", removePopovers);
        d3.select(window).on("click", removePopovers);

        // process rendering params
        processRenderingParams();

        // get current canvas object
        getCurCanvas();

        // render static trims
        renderStaticLayers();

        // set up zoom
        setupZoom(1);

        // set button state
        setButtonState();
    });
}

$(document).ready(pageOnLoad);
