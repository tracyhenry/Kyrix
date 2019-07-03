// get from backend the current canvas object assuming curCanvasId is already correctly set
function getCurCanvas(viewId) {
    var gvd = globalVar.views[viewId];

    // get all jumps starting at currrent canvas
    gvd.curJump = getJumpsByCanvasId(gvd.curCanvasId);

    // check if cache has it
    var postData = "id=" + gvd.curCanvasId;
    for (var i = 0; i < gvd.predicates.length; i++)
        postData += "&predicate" + i + "=" + getSqlPredicate(gvd.predicates[i]);
    if (postData in globalVar.cachedCanvases)
        return new Promise(function(resolve) {
            // note that we don't directly get canvas objects from gvd.project
            // because sometimes the canvas w/h is dynamic and not set, in which
            // case we need to fetch from the backend (using gvd.predicates)
            gvd.curCanvas = globalVar.cachedCanvases[postData].canvasObj;
            gvd.curStaticData = globalVar.cachedCanvases[postData].staticData;
            setupLayerLayouts(viewId);
            resolve();
        });

    // otherwise make a non-blocked http request to the server
    return $.ajax({
        type: "GET",
        url: globalVar.serverAddr + "/canvas",
        data: postData,
        success: function(data) {
            gvd.curCanvas = JSON.parse(data).canvas;
            gvd.curStaticData = JSON.parse(data).staticData;
            setupLayerLayouts(viewId);

            // insert into cache
            if (!(postData in globalVar.cachedCanvases)) {
                globalVar.cachedCanvases[postData] = {};
                globalVar.cachedCanvases[postData].canvasObj = gvd.curCanvas;
                globalVar.cachedCanvases[postData].staticData =
                    gvd.curStaticData;
            }
        }
    });
}

// setup <g>s and <svg>s for each layer
function setupLayerLayouts(viewId) {
    var gvd = globalVar.views[viewId];

    // number of layers
    var numLayers = gvd.curCanvas.layers.length;

    // set box flag
    if (param.fetchingScheme == "dbox") {
        gvd.boxX = [-1e5];
        gvd.boxY = [-1e5];
        gvd.boxH = [-1e5];
        gvd.boxW = [-1e5];
    }

    // set render data
    gvd.renderData = [];
    for (var i = numLayers - 1; i >= 0; i--) gvd.renderData.push([]);

    // create layers
    for (var i = numLayers - 1; i >= 0; i--) {
        var isStatic = gvd.curCanvas.layers[i].isStatic;
        // add new <g>
        d3.select(".view_" + viewId + ".maing")
            .append("g")
            .classed("view_" + viewId + " layerg layer" + i, true)
            .append("svg")
            .classed("view_" + viewId + " mainsvg", true)
            .classed("static", isStatic)
            .attr("width", gvd.viewportWidth)
            .attr("height", gvd.viewportHeight)
            .attr("preserveAspectRatio", "none")
            .attr("x", 0)
            .attr("y", 0)
            .attr(
                "viewBox",
                isStatic
                    ? "0 0" + " " + gvd.viewportWidth + " " + gvd.viewportHeight
                    : gvd.initialViewportX +
                          " " +
                          gvd.initialViewportY +
                          " " +
                          gvd.viewportWidth +
                          " " +
                          gvd.viewportHeight
            )
            .classed("lowestsvg", isStatic || param.fetchingScheme == "dbox");
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
function pageOnLoad(serverAddr) {
    // this function can only be called once
    if (globalVar.serverAddr != "N/A")
        throw new Error("kyrix initialized already!");
    if (serverAddr != null) {
        // get rid of the last '/'
        if (serverAddr[serverAddr.length - 1] == "/")
            serverAddr = serverAddr.substring(0, serverAddr.length - 1);
        globalVar.serverAddr = serverAddr;
    } else globalVar.serverAddr = "";

    // create a div where kyrix vis lives in
    var kyrixDiv = d3
        .select("body")
        .append("div")
        .classed("kyrixdiv", true);

    // get information about the first canvas to render
    $.ajax({
        type: "GET",
        url: globalVar.serverAddr + "/first",
        data: {},
        async: false,
        success: function(data) {
            var response = JSON.parse(data);
            globalVar.project = response.project;
            globalVar.tileW = +response.tileW;
            globalVar.tileH = +response.tileH;
            globalVar.renderingParams = JSON.parse(
                globalVar.project.renderingParams
            );
            processRenderingParams();

            // remove all jump option popovers when the window is resized
            d3.select(window).on("resize.popover", removePopovers);
            //d3.select(window).on("click", removePopovers);

            // set up container SVG
            var containerW = 0,
                containerH = 0;
            var viewSpecs = globalVar.project.views;
            for (var i = 0; i < viewSpecs.length; i++) {
                containerW = Math.max(
                    containerW,
                    viewSpecs[i].minx +
                        viewSpecs[i].width +
                        param.viewPadding * 2
                );
                containerH = Math.max(
                    containerH,
                    viewSpecs[i].miny +
                        viewSpecs[i].height +
                        param.viewPadding * 2
                );
            }
            kyrixDiv
                .append("svg")
                .attr("id", "containerSvg")
                .attr("width", containerW)
                .attr("height", containerH);

            for (var i = 0; i < viewSpecs.length; i++) {
                // get a reference for current globalvar dict
                var viewId = viewSpecs[i].id;
                globalVar.views[viewId] = {};
                var gvd = globalVar.views[viewId];

                // initial setup
                gvd.initialViewportX = viewSpecs[i].initialViewportX;
                gvd.initialViewportY = viewSpecs[i].initialViewportY;
                gvd.viewportWidth = viewSpecs[i].width;
                gvd.viewportHeight = viewSpecs[i].height;
                gvd.curCanvasId = viewSpecs[i].initialCanvasId;
                gvd.renderData = null;
                gvd.pendingBoxRequest = false;
                gvd.curCanvas = null;
                gvd.curJump = null;
                gvd.curStaticData = null;
                gvd.history = [];
                gvd.animation = false;
                gvd.predicates = [];
                gvd.highlightPredicates = [];
                if (gvd.curCanvasId != "") {
                    var predDict = JSON.parse(viewSpecs[i].initialPredicates);
                    var numLayer = getCanvasById(gvd.curCanvasId).layers.length;
                    for (var j = 0; j < numLayer; j++)
                        if ("layer" + j in predDict)
                            gvd.predicates.push(predDict["layer" + j]);
                        else gvd.predicates.push({});
                }

                // set up view svg
                d3.select("#containerSvg")
                    .append("svg")
                    .classed("view_" + viewId + " viewsvg", true)
                    .attr("width", gvd.viewportWidth + param.viewPadding * 2)
                    .attr("height", gvd.viewportHeight + param.viewPadding * 2)
                    .attr("x", viewSpecs[i].minx)
                    .attr("y", viewSpecs[i].miny)
                    .append("g")
                    .classed("view_" + viewId + " axesg", true)
                    .attr(
                        "transform",
                        "translate(" +
                            param.viewPadding +
                            "," +
                            param.viewPadding +
                            ")"
                    );

                // set up main group
                d3.select(".view_" + viewId + ".viewsvg")
                    .append("g")
                    .classed("view_" + viewId + " maing", true)
                    .attr(
                        "transform",
                        "translate(" +
                            param.viewPadding +
                            "," +
                            param.viewPadding +
                            ")"
                    )
                    .append("rect") // a transparent rect to receive pointer events
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", gvd.viewportWidth)
                    .attr("height", gvd.viewportHeight)
                    .style("opacity", 0);

                // initialize zoom buttons, must before getCurCanvas is called
                drawZoomButtons(viewId);
                d3.select(window).on("resize.zoombutton", function() {
                    for (var viewId in globalVar.views) drawZoomButtons(viewId);
                });

                // render this view
                if (gvd.curCanvasId != "") {
                    var gotCanvas = getCurCanvas(viewId);
                    gotCanvas.then(
                        (function(viewId) {
                            return function() {
                                // render static trims
                                renderStaticLayers(viewId);

                                // set up zoom
                                setupZoom(viewId, 1);

                                // set button state
                                setButtonState(viewId);
                            };
                        })(viewId)
                    );
                }
            }
        }
    });

    return kyrixDiv;
}
