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
            if (gvd.curCanvas.w < gvd.viewportWidth)
                gvd.curCanvas.w = gvd.viewportWidth;
            if (gvd.curCanvas.h < gvd.viewportHeight)
                gvd.curCanvas.h = gvd.viewportHeight;
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

    // set box coordinates
    gvd.boxX = [-1e5];
    gvd.boxY = [-1e5];
    gvd.boxH = [-1e5];
    gvd.boxW = [-1e5];

    // set render data
    gvd.renderData = [];
    for (var i = 0; i < numLayers; i++) gvd.renderData.push([]);
    gvd.tileRenderData = {};

    // create layers
    for (var i = numLayers - 1; i >= 0; i--) {
        var curLayer = gvd.curCanvas.layers[i];
        var isStatic = curLayer.isStatic;
        // add new <g>
        d3.select(".view_" + viewId + ".maing")
            .append("g")
            .classed("view_" + viewId + " layerg layer" + i, true)
            .append("svg")
            .classed("view_" + viewId + " mainsvg", true)
            .classed("static", isStatic)
            .classed("dbox", !isStatic && curLayer.fetchingScheme == "dbox")
            .classed("tiling", !isStatic && curLayer.fetchingScheme == "tiling")
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
            .classed(
                "lowestsvg",
                isStatic || curLayer.fetchingScheme == "dbox"
            );
    }
}

// loop over rendering parameters, convert them to function if needed
function processRenderingParams() {
    for (var key in globalVar.renderingParams) {
        var curValue = globalVar.renderingParams[key];
        if (typeof curValue == "string" && curValue.parseFunction() != null)
            globalVar.renderingParams[key] = curValue.parseFunction();
        // check if it's ssv parameters
        // if so, do a nested round of converting
        if (key.startsWith("ssv_")) {
            for (key in curValue) {
                var curV = curValue[key];
                if (typeof curV == "string" && curV.parseFunction() != null)
                    curValue[key] = curV.parseFunction();
            }
        }
    }
}

// add the styles to the document
function processStyles() {
    if (globalVar.project.styles.length <= 0) return;

    for (var i = globalVar.project.styles.length - 1; i >= 0; i--) {
        if (globalVar.project.styles[i].match(/https?:\/\//)) {
            d3.select("head")
                .append("link")
                .attr("rel", "stylesheet")
                .attr("type", "text/css")
                .attr("href", globalVar.project.styles[i]);
        } else {
            d3.select("head")
                .append("style")
                .classed("kyrixstyles", true)
                .attr("type", "text/css")
                .html(globalVar.project.styles[i]);
        }
    }
}

// resize kyrix vis to fit in vis div bounds
// also, call drawZoomButton to make buttons smaller/bigger
function resizeKyrixStuff(viewId) {
    drawZoomButtons(viewId);

    // for vis
    var viewClass = ".view_" + viewId;
    var div = d3.select(viewClass + ".kyrixvisdiv");

    // maximum space allowed in the div
    var bbox = div.node().getBoundingClientRect();
    var maxW = bbox.width;
    var maxH = bbox.height;

    // user-specified width/height
    var viewSvg = d3.select(viewClass + ".viewsvg");
    var viewWidth = viewSvg.attr("width");
    var viewHeight = viewSvg.attr("height");

    // maximum space according to the ratio of view svg
    var realW = Math.min(maxW, (maxH * viewWidth) / viewHeight);
    var realH = (realW * viewHeight) / viewWidth;

    // set viewbox accordingly
    viewSvg.attr(
        "viewBox",
        "0 0 " +
            (viewWidth * viewWidth) / realW +
            " " +
            (viewHeight * viewHeight) / realH
    );

    // center
    viewSvg
        .style("left", bbox.width / 2 - realW / 2 + "px")
        .style("top", bbox.height / 2 - realH / 2 + "px");
}

// set up page
function pageOnLoad(serverAddr, kyrixRawDiv) {
    if (serverAddr != null) {
        // get rid of the last '/'
        if (serverAddr[serverAddr.length - 1] == "/")
            serverAddr = serverAddr.substring(0, serverAddr.length - 1);
        globalVar.serverAddr = serverAddr;
    } else globalVar.serverAddr = "";

    // create a div where kyrix vis lives in
    var kyrixDiv = d3.select(kyrixRawDiv).classed("kyrixdiv", true);

    // get information about the first canvas to render
    // and return a promise representing whether kyrix is loaded
    return $.ajax({
        type: "GET",
        url: globalVar.serverAddr + "/first",
        data: {},
        async: false,
        success: function(data) {
            var response = JSON.parse(data);
            globalVar.project = response.project;
            globalVar.tileW = +response.tileW;
            globalVar.tileH = +response.tileH;
            // merge BGRP and rendering params
            globalVar.renderingParams = JSON.parse(
                globalVar.project.renderingParams
            );
            var BGRPKeys = Object.keys(globalVar.project.BGRP);
            for (var i = 0; i < BGRPKeys.length; i++) {
                var curBGRPKey = BGRPKeys[i];
                if (!(curBGRPKey in globalVar.renderingParams))
                    globalVar.renderingParams[curBGRPKey] = {};
                var curRPEntry = globalVar.renderingParams[curBGRPKey];
                globalVar.renderingParams[curBGRPKey] = {
                    ...curRPEntry,
                    ...globalVar.project.BGRP[curBGRPKey]
                };
            }
            processRenderingParams();

            // process user-defined CSS styles
            processStyles();

            // remove all jump option popovers when the window is resized
            d3.select(window).on("resize.popover", removePopovers);
            d3.select(window).on("click", removePopovers);

            // create view layouts
            var viewSpecs = globalVar.project.views;
            for (var i = 0; i < viewSpecs.length; i++) {
                // get a reference for current globalvar dict
                var viewId = viewSpecs[i].id;
                globalVar.views[viewId] = {};
                var gvd = globalVar.views[viewId];

                // create a view div, a button div and a vis div
                var viewDiv = kyrixDiv
                    .append("div")
                    .classed("kyrixviewdiv", true)
                    .classed("view_" + viewId, true);
                var buttonDiv = viewDiv
                    .append("div")
                    .classed("kyrixbuttondiv", true)
                    .classed("view_" + viewId, true);
                var visDiv = viewDiv
                    .append("div")
                    .classed("kyrixvisdiv", true)
                    .classed("view_" + viewId, true);

                // make things responsive
                new ResizeSensor(
                    visDiv.node(),
                    (function(viewId) {
                        return function() {
                            resizeKyrixStuff(viewId);
                        };
                    })(viewId)
                );

                // initial setup
                gvd.initialViewportX = viewSpecs[i].initialViewportX;
                gvd.initialViewportY = viewSpecs[i].initialViewportY;
                gvd.viewportWidth = viewSpecs[i].width;
                gvd.viewportHeight = viewSpecs[i].height;
                gvd.curCanvasId = viewSpecs[i].initialCanvasId;
                gvd.renderData = null;
                gvd.tileRenderData = null;
                gvd.pendingBoxRequest = null;
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

                var visWidth = gvd.viewportWidth + param.viewPadding * 2;
                var visHeight = gvd.viewportHeight + param.viewPadding * 2;
                // Set  max size (don't allow div to get bigger than svg)
                // visDiv
                //     .style("max-width", visWidth + "px")
                //     .style("max-height",visHeight + "px");

                // set up view svg
                visDiv
                    .append("svg")
                    .classed("view_" + viewId + " viewsvg", true)
                    .attr("width", visWidth)
                    .attr("height", visHeight)
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
                                setBackButtonState(viewId);
                            };
                        })(viewId)
                    );
                }
            }
        }
    });
}
