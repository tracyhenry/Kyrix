// called on page load, and on page resize
function drawZoomButtons(viewId) {
    var viewClass = ".view_" + viewId;
    if (globalVar.views[viewId].curCanvasId == "") return;

    // create buttons if not existed
    if (d3.select(viewClass + ".gobackbutton").empty())
        d3.select(".kyrixdiv")
            .append("button")
            .classed("view_" + viewId + " gobackbutton", true)
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .classed("btn-lg", true)
            .html('<span class="glyphicon glyphicon-arrow-left"></span>');
    if (d3.select(viewClass + ".zoominbutton").empty())
        d3.select(".kyrixdiv")
            .append("button")
            .classed("view_" + viewId + " zoominbutton", true)
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .classed("btn-lg", true)
            .html('<span class="glyphicon glyphicon-zoom-in"></span>');
    if (d3.select(viewClass + ".zoomoutbutton").empty())
        d3.select(".kyrixdiv")
            .append("button")
            .classed("view_" + viewId + " zoomoutbutton", true)
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .classed("btn-lg", true)
            .html('<span class="glyphicon glyphicon-zoom-out"></span>');

    // position the buttons at fixed positions in the top-left of the kyrixdiv
    var bbox = d3
        .select("#containerSvg")
        .node()
        .getBoundingClientRect();

    // in pageOnLoad.js, we have curViewport[2] = (containerW * containerW) / realW
    // realW / containerW = (containerW * containerW) / curViewport[2] / containerW
    //                    = containerW / curViewport[2]
    var containerW = d3.select("#containerSvg").attr("width");
    var curViewport = d3.select("#containerSvg").attr("viewBox");
    var curViewportW;
    if (curViewport == null) curViewportW = containerW;
    else curViewportW = curViewport.split(" ")[2];
    var bLeft =
        +bbox.left +
        (+d3.select(viewClass + ".viewsvg").attr("x") * containerW) /
            curViewportW;
    var bTop =
        +bbox.top +
        (+(+d3.select(viewClass + ".viewsvg").attr("y")) * containerW) /
            curViewportW;
    var leftMargin = 50;
    var topMargin = 80;
    var dist = 50;
    d3.select(viewClass + ".gobackbutton")
        .style("top", bTop + topMargin + "px")
        .style("left", bLeft - leftMargin + "px");
    d3.select(viewClass + ".zoominbutton")
        .style("top", bTop + topMargin + dist + "px")
        .style("left", bLeft - leftMargin + "px");
    d3.select(viewClass + ".zoomoutbutton")
        .style("top", bTop + topMargin + dist * 2 + "px")
        .style("left", bLeft - leftMargin + "px");
}

// called after a new canvas is completely rendered
function setBackButtonState(viewId) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // goback
    if (gvd.history.length > 0)
        d3.select(viewClass + ".gobackbutton")
            .attr("disabled", null)
            .on("click", function() {
                backspaceSemanticJump(viewId);
            });
    else d3.select(viewClass + ".gobackbutton").attr("disabled", true);
}

// called in completeZoom() and RegisterJump()
// before global variables are changed
function logHistory(viewId, jump) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;
    var jumpType = jump.type;
    var curHistory = {curJump: jump, jumpType: jumpType};

    // save global variables
    curHistory.predicates = gvd.predicates;
    curHistory.highlightPredicates = gvd.highlightPredicates;
    curHistory.canvasId = gvd.curCanvasId;
    curHistory.canvasObj = gvd.curCanvas;
    curHistory.jumps = gvd.curJump;
    curHistory.staticData = gvd.curStaticData;
    curHistory.initialScale = d3.zoomTransform(
        d3.select(viewClass + ".maing").node()
    ).k;

    // save current viewport
    var curViewport = [0, 0, gvd.viewportWidth, gvd.viewportHeight];
    if (d3.select(viewClass + ".mainsvg:not(.static)").size())
        curViewport = d3
            .select(viewClass + ".mainsvg:not(.static)")
            .attr("viewBox")
            .split(" ");
    curHistory.viewportX = +curViewport[0];
    curHistory.viewportY = +curViewport[1];
    curHistory.viewportW = +curViewport[2];
    curHistory.viewportH = +curViewport[3];

    gvd.history.push(curHistory);
}

// handler for go back button
function backspaceSemanticJump(viewId) {
    var gvd = globalVar.views[viewId];

    // get and pop last history object
    var curHistory = gvd.history.pop();

    // disable and remove stuff
    var newJump = JSON.parse(JSON.stringify(curHistory.curJump));
    newJump.backspace = true;
    preJump(viewId, newJump);

    // assign back global vars
    gvd.curCanvasId = curHistory.canvasId;
    gvd.curCanvas = curHistory.canvasObj;
    gvd.curJump = curHistory.jumps;
    gvd.curStaticData = curHistory.staticData;
    gvd.predicates = curHistory.predicates;
    gvd.highlightPredicates = curHistory.highlightPredicates;
    gvd.initialViewportX = curHistory.viewportX;
    gvd.initialViewportY = curHistory.viewportY;
    gvd.initialScale = curHistory.initialScale;

    // start animation
    if (
        newJump.type == param.semanticZoom ||
        newJump.type == param.geometricSemanticZoom
    )
        animateBackspaceSemanticZoom(
            viewId,
            newJump,
            curHistory.startView,
            curHistory.endView
        );
    else {
        // start a exit & fade transition
        var slideDirection = (curHistory.curJump.slideDirection + 180) % 360;
        animateSlide(
            viewId,
            slideDirection,
            gvd.initialViewportX,
            gvd.initialViewportY,
            gvd.initialScale || 1,
            newJump
        );
    }
}

// handler for zoom in button
function literalZoomIn(viewId) {
    var gvd = globalVar.views[viewId];

    startLiteralZoomTransition(
        viewId,
        [gvd.viewportWidth / 2, gvd.viewportHeight / 2],
        param.literalZoomFactorPerStep,
        param.literalZoomDuration
    );
}

// handler for zoom out button
function literalZoomOut(viewId) {
    var gvd = globalVar.views[viewId];

    startLiteralZoomTransition(
        viewId,
        [gvd.viewportWidth / 2, gvd.viewportHeight / 2],
        -param.literalZoomFactorPerStep,
        param.literalZoomDuration
    );
}
