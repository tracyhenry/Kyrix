// called on page load, and on page resize
function drawZoomButtons(viewId) {
    var viewClass = ".view_" + viewId;
    if (globalVar.views[viewId].curCanvasId == "") return;

    // create buttons if not existed
    if (d3.select(viewClass + ".gobackbutton").empty())
        d3.select(viewClass + ".kyrixbuttondiv")
            .append("button")
            .classed("view_" + viewId + " gobackbutton", true)
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .html('<span class="glyphicon glyphicon-arrow-left"></span>');
    if (d3.select(viewClass + ".zoominbutton").empty())
        d3.select(viewClass + ".kyrixbuttondiv")
            .append("button")
            .classed("view_" + viewId + " zoominbutton", true)
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .html('<span class="glyphicon glyphicon-zoom-in"></span>');
    if (d3.select(viewClass + ".zoomoutbutton").empty())
        d3.select(viewClass + ".kyrixbuttondiv")
            .append("button")
            .classed("view_" + viewId + " zoomoutbutton", true)
            .attr("disabled", "true")
            .classed("btn", true)
            .classed("btn-default", true)
            .html('<span class="glyphicon glyphicon-zoom-out"></span>');

    // deciding button size according to vis size
    var bbox = d3
        .select(viewClass + ".kyrixviewdiv")
        .node()
        .getBoundingClientRect();
    var minSize = Math.min(bbox.width, bbox.height);
    var sizeThresholds = [400, 800, 1200];
    var sizeClasses = ["btn-xs", "btn-sm", ""];
    var sizeClass = "btn-lg";
    for (var i = 0; i < sizeThresholds.length; i++)
        if (minSize <= sizeThresholds[i]) {
            sizeClass = sizeClasses[i];
            break;
        }
    d3.selectAll(viewClass + ".kyrixbuttondiv button")
        .classed("btn-xs", false)
        .classed("btn-sm", false)
        .classed("btn-lg", false);
    if (sizeClass != "")
        d3.selectAll(viewClass + ".kyrixbuttondiv button").classed(
            sizeClass,
            true
        );
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
