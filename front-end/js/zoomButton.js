// called on page load, and on page resize
function drawZoomButtons() {

    // create buttons if not existed
    if (d3.select("#gobackbutton").empty())
        d3.select("body")
            .append("button")
            .attr("id", "gobackbutton")
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .classed("btn-lg", true)
            .html("<span class=\"glyphicon glyphicon-arrow-left\"></span>");
    if (d3.select("#zoominbutton").empty())
        d3.select("body")
            .append("button")
            .attr("id", "zoominbutton")
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .classed("btn-lg", true)
            .html("<span class=\"glyphicon glyphicon-zoom-in\"></span>");
    if (d3.select("#zoomoutbutton").empty())
        d3.select("body")
            .append("button")
            .attr("id", "zoomoutbutton")
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .classed("btn-lg", true)
            .html("<span class=\"glyphicon glyphicon-zoom-out\"></span>");

    // get client bounding rect of #containerSvg
    var bbox = d3.select("#containerSvg").node().getBoundingClientRect();

    // position the buttons
    var leftMargin = 100;
    var topMargin = 50;
    var dist = 50;
    d3.select("#gobackbutton")
        .style("top", +bbox.top + topMargin + "px")
        .style("left", (bbox.left - leftMargin) + "px");
    d3.select("#zoominbutton")
        .style("top", +bbox.top + topMargin + dist + "px")
        .style("left", (bbox.left - leftMargin) + "px");
    d3.select("#zoomoutbutton")
        .style("top", +bbox.top + topMargin + dist * 2 + "px")
        .style("left", (bbox.left - leftMargin) + "px");
};

// called after a new canvas is completely rendered
function setButtonState() {

    // goback
    if (globalVar.history.length > 0)
        d3.select("#gobackbutton")
            .attr("disabled", null)
            .on("click", backspace);
    else
        d3.select("#gobackbutton")
            .attr("disabled", true);

    // literal zoom buttons
    d3.select("#zoominbutton")
        .attr("disabled", true);
    d3.select("#zoomoutbutton")
        .attr("disabled", true);
    var jumps = globalVar.curJump;
    for (var i = 0; i < jumps.length; i ++)
        if (jumps[i].type == "literal_zoom_in")
            d3.select("#zoominbutton")
                .attr("disabled", null)
                .on("click", literalZoomIn);
        else if (jumps[i].type == "literal_zoom_out")
            d3.select("#zoomoutbutton")
                .attr("disabled", null)
                .on("click", literalZoomOut);
};

// called in completeZoom() and RegisterJump()
// before global variables are changed
function logHistory(zoom_type) {

    var curHistory = {"zoomType" : zoom_type};

    // save global variables
    curHistory.predicates = globalVar.predicates;
    curHistory.canvasId = globalVar.curCanvasId;
    curHistory.canvasObj = globalVar.curCanvas;
    curHistory.jumps = globalVar.curJump;
    curHistory.staticData = globalVar.curStaticData;

    // save current viewport
    var curViewport = [0, 0, globalVar.viewportWidth, globalVar.viewportHeight];
    if (d3.select(".mainsvg:not(.static)").size())
        curViewport = d3.select(".mainsvg:not(.static)").attr("viewBox").split(" ");
    curHistory.viewportX = +curViewport[0];
    curHistory.viewportY = +curViewport[1];
    curHistory.viewportW = +curViewport[2];
    curHistory.viewportH = +curViewport[3];

    globalVar.history.push(curHistory);
};

// handler for go back button
function backspace() {

    // get and pop last history object
    var curHistory = globalVar.history.pop();

    // whether this semantic zoom is also geometric
    var zoomType = curHistory.zoomType;
    var fadingAnimation = (zoomType == param.semanticZoom ? true : false);

    // disable and remove stuff
    preAnimation();

    // assign back global vars
    globalVar.curCanvasId = curHistory.canvasId;
    globalVar.curCanvas = curHistory.canvasObj;
    globalVar.curJump = curHistory.jumps;
    globalVar.curStaticData = curHistory.staticData;
    globalVar.predicates = curHistory.predicates;
    globalVar.initialViewportX = curHistory.viewportX;
    globalVar.initialViewportY = curHistory.viewportY;

    // get current viewport
    var curViewport = [0, 0, globalVar.viewportWidth, globalVar.viewportHeight];
    if (d3.select(".oldmainsvg:not(.static)").size())
        curViewport = d3.select(".oldmainsvg:not(.static)").attr("viewBox").split(" ");

    // start a exit & fade transition
    if (fadingAnimation)
        d3.transition("fadeTween")
            .duration(param.enteringDuration)
            .tween("fadeTween", function() {

                return function(t) {fadeAndExit(d3.easeCircleOut(1 - t));};
            })
            .on("start", startZoomingBack);
    else {
        d3.selectAll(".oldlayerg").remove();
        startZoomingBack();
    }

    function startZoomingBack() {

        // schedule a zoom back transition
        var zoomDuration = d3.interpolateZoom(curHistory.endView, curHistory.startView).duration;
        var enteringDelay = Math.max(Math.round(zoomDuration * param.enteringDelta) + param.enteringDuration - zoomDuration,
            param.axesOutDuration);
        if (! fadingAnimation)
            enteringDelay = 0;
        d3.transition("zoomOutTween")
            .delay(enteringDelay)
            .duration(zoomDuration)
            .tween("zoomOutTween", function () {

                var i = d3.interpolateZoom(curHistory.endView, curHistory.startView);
                return function (t) {enterAndZoom(t, i(t));};
            })
            .on("start", function() {

                // set up layer layouts
                setupLayerLayouts();

                // static trim
                renderStaticLayers();

                // render
                RefreshDynamicLayers(globalVar.initialViewportX, globalVar.initialViewportY);
            })
            .on("end", function () {

                postAnimation();
            });
    }

    function enterAndZoom(t, v) {

        var vWidth = v[2];
        var vHeight = globalVar.viewportHeight / globalVar.viewportWidth * vWidth;
        var minx = globalVar.initialViewportX + v[0] - vWidth / 2.0;
        var miny = globalVar.initialViewportY + v[1] - vHeight / 2.0;

        // change viewBox of dynamic layers
        d3.selectAll(".mainsvg:not(.static)")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change viewBox of static layers
        minx = v[0] - vWidth / 2.0;
        miny = v[1] - vHeight / 2.0;
        d3.selectAll(".mainsvg.static")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change opacity
        if (fadingAnimation) {
            var threshold = param.fadeThreshold;
            if (1 - t >= threshold) {
                d3.selectAll(".mainsvg")
                    .style("opacity", 1.0 - (1 - t - threshold) / (1.0 - threshold));
            }
        }
    };

    function fadeAndExit(t) {

        var vWidth = globalVar.viewportWidth * param.enteringScaleFactor
            / (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var vHeight = globalVar.viewportHeight * param.enteringScaleFactor
            / (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var minx = +curViewport[0] + globalVar.viewportWidth / 2.0 - vWidth / 2.0;
        var miny = +curViewport[1] + globalVar.viewportHeight / 2.0 - vHeight / 2.0;

        // change viewBox of old dynamic layers
        d3.selectAll(".oldmainsvg:not(.static)")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change viewBox of old static layers
        minx = globalVar.viewportWidth / 2 - vWidth / 2;
        miny = globalVar.viewportHeight / 2 - vHeight / 2;
        d3.selectAll(".oldmainsvg.static")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change opacity
        d3.selectAll(".oldmainsvg").style("opacity", t);
    };
};

// handler for zoom in button
function literalZoomIn() {

    startLiteralZoomTransition([globalVar.viewportWidth / 2, globalVar.viewportHeight / 2],
        globalVar.maxScale, globalVar.maxScale / 2 * param.literalZoomDuration);
};

// handler for zoom out button
function literalZoomOut() {

    startLiteralZoomTransition([globalVar.viewportWidth / 2, globalVar.viewportHeight / 2],
        globalVar.minScale, 1 / globalVar.minScale/ 2 * param.literalZoomDuration);

};
