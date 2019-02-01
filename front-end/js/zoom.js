// set up zoom translate & scale extent
// call zoom on container svg
// reset zoom transform
// called after every jump
function setupZoom(viewId, initialScale) {

    // get a reference for current globalvar dict
    var globalVarDict = globalVar.views[viewId];

    // calculate minScale, maxScale
    globalVarDict.minScale = Math.min(globalVarDict.curCanvas.zoomOutFactorX,
        globalVarDict.curCanvas.zoomOutFactorY, 1);
    globalVarDict.maxScale = Math.max(globalVarDict.curCanvas.zoomInFactorX,
        globalVarDict.curCanvas.zoomInFactorY, 1);

    // set up zoom
    globalVarDict.zoom = d3.zoom()
        .scaleExtent([globalVarDict.minScale, globalVarDict.maxScale])
        .on("zoom", function () {zoomed(viewId);});

    // set up zooms
    d3.select(".view" + viewId + ".maing")
        .call(globalVarDict.zoom)
        .on("wheel.zoom", null)
        .on("dblclick.zoom", function () {

            var mousePos = d3.mouse(this);
            event.preventDefault();
            event.stopImmediatePropagation();
            var finalK = (event.shiftKey ? globalVarDict.minScale : globalVarDict.maxScale);
            var duration = (event.shiftKey ? 1 / finalK / 2 : finalK / 2) * param.literalZoomDuration;
            startLiteralZoomTransition(viewId, mousePos, finalK, duration);
        })
        .call(globalVarDict.zoom.transform, d3.zoomIdentity.scale(initialScale));

    // hardcode - disable pan for spectrogram view
    d3.select(".view1.maing")
        .on("mouseup.zoom", null)
        .on("mousemove.zoom", null)
        .on("mousedown.zoom", null);

    // hardcode - disable pan and zoom when labeling mode is list
    if (param.labelingMode == "list")
        d3.selectAll(".maing")
            .on(".zoom", null);
};

function startLiteralZoomTransition(viewId, center, scale, duration) {

    if (1 - 1e-6 <= scale && scale <= 1 + 1e-6)
        return ;

    var curSelection = d3.select(".view" + viewId + ".maing");
    // disable cursor pointers, buttons and onclick listeners
    d3.select(".view" + viewId + ".viewsvg")
        .selectAll("*")
        .style("cursor", "auto")
        .on("click", null);
    curSelection.on(".zoom", null);

    d3.transition()
        .duration(duration)
        .tween("literalTween", function() {
            var initialZoomTransform = d3.zoomTransform(curSelection.node());
            var i = d3.interpolateNumber(1, scale);
            return function (t) {
                var curK = i(t);
                var curTX = center[0] + curK * (-center[0] + initialZoomTransform.x);
                var curTY = center[1] + curK * (-center[1] + initialZoomTransform.y);
                var curZoomTransform = d3.zoomIdentity.translate(curTX, curTY).scale(curK);
                curSelection.call(globalVar.views[viewId].zoom.transform, curZoomTransform);
            };
        });
}

function completeZoom(viewId, zoomType, oldZoomFactorX, oldZoomFactorY) {

    // get a reference for current globalvar dict
    var globalVarDict = globalVar.views[viewId];

    // get the id of the canvas to zoom into
    var jumps = globalVarDict.curJump;
    for (var i = 0; i < jumps.length; i ++)
        if (jumps[i].type == zoomType)
            globalVarDict.curCanvasId = jumps[i].destId;

    // get new viewport coordinates
    var curViewport = d3.select(".view" + viewId + ".mainsvg:not(.static)")
        .attr("viewBox").split(" ");
    globalVarDict.initialViewportX = curViewport[0] * oldZoomFactorX;
    globalVarDict.initialViewportY = curViewport[1] * oldZoomFactorY;

    // get the canvas object
    var gotCanvas = getCurCanvas(viewId);
    gotCanvas.then(function () {
        // render static trims
        renderStaticLayers(viewId);

        // set up zoom
        setupZoom(viewId, 1);
    });
};

// listener function for zoom actions
function zoomed(viewId) {

    // get a reference for current globalvar dict
    var globalVarDict = globalVar.views[viewId];

    // no dynamic layers? return
    if (d3.select(".view" + viewId + ".mainsvg:not(.static)").size() == 0)
        return ;

    // frequently accessed global variables
    var cWidth = globalVarDict.curCanvas.w;
    var cHeight = globalVarDict.curCanvas.h;
    var vWidth = globalVarDict.viewportWidth;
    var vHeight = globalVarDict.viewportHeight;
    var iVX = globalVarDict.initialViewportX;
    var iVY = globalVarDict.initialViewportY;
    var zoomInFactorX = globalVarDict.curCanvas.zoomInFactorX;
    var zoomOutFactorX = globalVarDict.curCanvas.zoomOutFactorX;
    var zoomInFactorY = globalVarDict.curCanvas.zoomInFactorY;
    var zoomOutFactorY = globalVarDict.curCanvas.zoomOutFactorY;

    // get current zoom transform
    var transform = d3.event.transform;

    // get scale x and y
    var scaleX = transform.k;
    var scaleY = transform.k;
    if (zoomInFactorX <= 1 && zoomOutFactorX >= 1)
        scaleX = 1;
    if (zoomInFactorY <= 1 && zoomOutFactorY >= 1)
        scaleY = 1;

    // get new viewport coordinates
    var viewportX = iVX - transform.x / scaleX;
    var viewportY = iVY - transform.y / scaleY;

    // restrict panning by modifying d3 event transform, which is a bit sketchy. However,
    // d3-zoom is so under-documented that I could not use it to make single-axis literal zooms work
    if (viewportX < 0) {
        viewportX = 0;
        d3.event.transform.x = iVX * scaleX;
    }
    if (viewportX > cWidth - vWidth / scaleX) {
        viewportX = cWidth - vWidth / scaleX;
        d3.event.transform.x = (iVX - viewportX) * scaleX;
    }
    if (viewportY < 0) {
        viewportY = 0;
        d3.event.transform.y = iVY * scaleY;
    }
    if (viewportY > cHeight - vHeight / scaleY) {
        viewportY = cHeight - vHeight / scaleY;
        d3.event.transform.y = (iVY - viewportY) * scaleY;
    }

    // set viewBox size && refresh canvas
    var curViewport = d3.select(".view" + viewId + ".mainsvg:not(.static)")
        .attr("viewBox")
        .split(" ");
    curViewport[2] = vWidth / scaleX;
    curViewport[3] = vHeight / scaleY;
    d3.selectAll(".view" + viewId + ".mainsvg:not(.static)")
        .attr("viewBox", curViewport[0]
            + " " + curViewport[1]
            + " " + curViewport[2]
            + " " + curViewport[3]);

    // get data
    RefreshDynamicLayers(viewId, viewportX, viewportY);

    // hardcoding - mark the median segment & trigger pan in spectrogram
    if (viewId == 2) {
        markMedianSegment();
        var deltaX = (curViewport[0] - viewportX) / param.pixelPerSeg;
        var curSelection = d3.select(".view1.maing");
        var zoomTransform = d3.zoomTransform(curSelection.node());
        zoomTransform = zoomTransform.translate(deltaX, 0);
        curSelection.call(globalVar.views[1].zoom.transform, zoomTransform);
        var curViewport = d3.select(".view1.mainsvg:not(.static)")
            .attr("viewBox").split(" ");
        RefreshDynamicLayers(1, curViewport[0], curViewport[1]);
    }

    // check if zoom scale reaches zoomInFactor
    if ((zoomInFactorX > 1 && scaleX >= globalVarDict.maxScale) ||
        (zoomInFactorY > 1 && scaleY >= globalVarDict.maxScale))
        completeZoom(viewId, "literal_zoom_in", zoomInFactorX, zoomInFactorY);

    // check if zoom scale reaches zoomOutFactor
    if ((zoomOutFactorX < 1 && scaleX <= globalVarDict.minScale) ||
        (zoomOutFactorY < 1 && scaleY <= globalVarDict.minScale))
        completeZoom(viewId, "literal_zoom_out", zoomOutFactorX, zoomOutFactorY);
};

// Hardcoding: mark median segment
function markMedianSegment() {

    var curViewport = d3.select(".view2.mainsvg:not(.static)")
        .attr("viewBox").split(" ");
    var containsMiddleLine = function(d) {
        var vpMiddleLine = +curViewport[0] + curViewport[2] / 2;
        return (d[3] * param.pixelPerSeg <= vpMiddleLine)
            && (vpMiddleLine < (+d[3] + 1) * param.pixelPerSeg);
    };
	d3.selectAll(".eegrect")
		.filter(function (d) {
			return containsMiddleLine(d);
		})
		.style("opacity", 1)
		.attr("fill", "white")
		.style("stroke", "pink")
		.style("stroke-width", 8)
		.call(function (middleRect) {
			if (!middleRect.empty()) {
				globalVar.Editor.selectRow(middleRect.datum());
			}
		});

    d3.selectAll(".eegrect")
        .filter(function (d) {
            return ! containsMiddleLine(d);
        })
        .style("opacity", 0);
}
