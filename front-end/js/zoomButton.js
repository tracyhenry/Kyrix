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
    var leftMargin = 20;
    var topMargin = 20;
    var dist = 50;
    d3.select(viewClass + ".gobackbutton")
        .style("top", topMargin + "px")
        .style("left", leftMargin + "px");
    d3.select(viewClass + ".zoominbutton")
        .style("top", topMargin + dist + "px")
        .style("left", leftMargin + "px");
    d3.select(viewClass + ".zoomoutbutton")
        .style("top", topMargin + dist * 2 + "px")
        .style("left", leftMargin + "px");
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
                var jumpType = gvd.history[gvd.history.length - 1].jumpType;
                if (
                    jumpType == param.semanticZoom ||
                    jumpType == param.geometricSemanticZoom
                )
                    backspaceSemanticZoom(viewId);
                else backspaceSlide(viewId);
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
function backspaceSemanticZoom(viewId) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // get and pop last history object
    var curHistory = gvd.history.pop();

    // whether this semantic zoom is also geometric
    var jumpType = curHistory.jumpType;
    var fadingAnimation = jumpType == param.semanticZoom ? true : false;

    // disable and remove stuff
    preJump(viewId, jumpType);

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

    // get current viewport
    var curViewport = [0, 0, gvd.viewportWidth, gvd.viewportHeight];
    if (d3.select(viewClass + ".oldmainsvg:not(.static)").size())
        curViewport = d3
            .select(viewClass + ".oldmainsvg:not(.static)")
            .attr("viewBox")
            .split(" ");

    // start a exit & fade transition
    if (fadingAnimation)
        d3.transition("fadeTween_" + viewId)
            .duration(param.semanticZoomEnteringDuration)
            .tween("fadeTween", function() {
                return function(t) {
                    fadeAndExit(d3.easeCircleOut(1 - t));
                };
            })
            .on("start", startZoomingBack);
    else {
        for (var i = 0; i < gvd.curCanvas.layers.length; i++)
            if (gvd.curCanvas.layers[i].isStatic)
                d3.selectAll(viewClass + ".oldlayerg" + ".layer" + i).remove();
        startZoomingBack();
    }

    function startZoomingBack() {
        // schedule a zoom back transition
        var zoomDuration = d3.interpolateZoom(
            curHistory.endView,
            curHistory.startView
        ).duration;
        var enteringDelay = Math.max(
            Math.round(zoomDuration * param.semanticZoomEnteringDelta) +
                param.semanticZoomEnteringDuration -
                zoomDuration,
            param.axesOutDuration
        );
        if (!fadingAnimation) enteringDelay = 0;
        d3.transition("zoomOutTween_" + viewId)
            .delay(enteringDelay)
            .duration(zoomDuration)
            .tween("zoomOutTween", function() {
                var i = d3.interpolateZoom(
                    curHistory.endView,
                    curHistory.startView
                );
                return function(t) {
                    enterAndZoom(t, i(t));
                };
            })
            .ease(d3.easeSinIn)
            .on("start", function() {
                // set up layer layouts
                setupLayerLayouts(viewId);

                // static trim
                renderStaticLayers(viewId);

                // render
                RefreshDynamicLayers(
                    viewId,
                    gvd.initialViewportX,
                    gvd.initialViewportY
                );
            })
            .on("end", function() {
                postJump(viewId, jumpType);
            });
    }

    function enterAndZoom(t, v) {
        var vWidth = v[2];
        var vHeight = (gvd.viewportHeight / gvd.viewportWidth) * vWidth;
        var minx = gvd.initialViewportX + v[0] - vWidth / 2.0;
        var miny = gvd.initialViewportY + v[1] - vHeight / 2.0;

        // change viewBox of dynamic layers
        d3.selectAll(viewClass + ".mainsvg:not(.static)").attr(
            "viewBox",
            minx + " " + miny + " " + vWidth + " " + vHeight
        );

        // change viewBox of static layers
        minx = v[0] - vWidth / 2.0;
        miny = v[1] - vHeight / 2.0;
        var k = gvd.initialScale || 1;
        d3.selectAll(viewClass + ".mainsvg.static").attr(
            "viewBox",
            minx * k + " " + miny * k + " " + vWidth * k + " " + vHeight * k
        );

        // change opacity
        if (fadingAnimation) {
            var threshold = param.fadeThreshold;
            if (1 - t >= threshold) {
                d3.selectAll(viewClass + ".mainsvg").style(
                    "opacity",
                    1.0 - (1 - t - threshold) / (1.0 - threshold)
                );
            }
        }
    }

    function fadeAndExit(t) {
        var vWidth =
            (gvd.viewportWidth * param.enteringScaleFactor) /
            (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var vHeight =
            (gvd.viewportHeight * param.enteringScaleFactor) /
            (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var minx = +curViewport[0] + gvd.viewportWidth / 2.0 - vWidth / 2.0;
        var miny = +curViewport[1] + gvd.viewportHeight / 2.0 - vHeight / 2.0;

        // change viewBox of old dynamic layers
        // TODO: this'll probably fail when zooming back from a literal zoom canvas
        d3.selectAll(viewClass + ".oldmainsvg:not(.static)").attr(
            "viewBox",
            minx + " " + miny + " " + vWidth + " " + vHeight
        );

        // change viewBox of old static layers
        minx = gvd.viewportWidth / 2 - vWidth / 2;
        miny = gvd.viewportHeight / 2 - vHeight / 2;
        d3.selectAll(viewClass + ".oldmainsvg.static").attr(
            "viewBox",
            minx + " " + miny + " " + vWidth + " " + vHeight
        );

        // change opacity
        d3.selectAll(viewClass + ".oldmainsvg").style("opacity", t);
    }
}

// handler for go back button
function backspaceSlide(viewId) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // get and pop last history object
    var curHistory = gvd.history.pop();

    // whether this semantic zoom is also geometric
    var jumpType = curHistory.jumpType;

    // disable and remove stuff
    preJump(viewId, jumpType);

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

    // get current viewport
    var curViewport = [0, 0, gvd.viewportWidth, gvd.viewportHeight];
    if (d3.select(viewClass + ".oldmainsvg:not(.static)").size())
        curViewport = d3
            .select(viewClass + ".oldmainsvg:not(.static)")
            .attr("viewBox")
            .split(" ");

    // start a exit & fade transition
    var slideDirection = (curHistory.curJump.slideDirection + 180) % 360;
    var dir = ((360 - curHistory.curJump.slideDirection) / 180) * Math.PI;
    var cos = Math.cos(dir);
    var sin = Math.sin(dir);
    var reverseDir = ((360 - slideDirection) / 180) * Math.PI;
    var rCos = Math.cos(reverseDir);
    var rSin = Math.sin(reverseDir);
    d3.transition("fadeTween_" + viewId)
        .duration(param.slideEnteringDuration)
        .tween("fadeTween", function() {
            return function(t) {
                exit(t);
            };
        })
        .ease(d3.easeSinOut)
        .on("start", function() {
            // cloud svg
            var cloudSvg = d3
                .select(viewClass + ".oldlayerg")
                .append("svg")
                .attr(
                    "viewBox",
                    "0 0 " + gvd.viewportWidth + " " + gvd.viewportHeight
                )
                .attr("width", gvd.viewportWidth)
                .attr("height", gvd.viewportHeight)
                .style("opacity", 0)
                .attr("id", "cloudsvg");

            // append the images
            var imgWidth = 256;
            var imgHeight = 256;
            var cx = gvd.viewportWidth / 2.0;
            var cy = gvd.viewportHeight / 2.0;
            var dx1 = Math.abs(imgHeight * cos * 1.5);
            var dy1 = Math.abs(imgHeight * sin * 1.5);
            var dx2 = Math.abs(imgWidth * sin * 1.5);
            var dy2 = Math.abs(imgHeight * cos * 1.5);
            for (var i = -10; i < 10; i++)
                for (var j = -10; j < 10; j++) {
                    var curX = cx + i * dx1 + i * dx2 + imgWidth;
                    var curY = cy + j * dy1 + j * dy2 + imgHeight;
                    cloudSvg
                        .append("image")
                        .attr("x", curX - imgWidth / 2.0)
                        .attr("y", curY - imgHeight / 2.0)
                        .attr("width", imgWidth)
                        .attr("height", imgHeight)
                        .attr(
                            "xlink:href",
                            "https://live.staticflickr.com/65535/49735371613_70cb0051b2_b.jpg"
                        )
                        .attr(
                            "transform",
                            "rotate(" +
                                (slideDirection > 90 && slideDirection < 270
                                    ? 360 - ((slideDirection + 180) % 360)
                                    : 360 - slideDirection) +
                                ", " +
                                curX +
                                ", " +
                                curY +
                                ")"
                        );
                }

            var supermanSvg = d3
                .select(viewClass + ".oldlayerg")
                .append("svg")
                .attr("id", "supermansvg")
                .attr("width", gvd.viewportWidth)
                .attr("height", gvd.viewportHeight)
                .append("image")
                .attr("x", gvd.viewportWidth / 2 - 150)
                .attr("y", gvd.viewportHeight / 2 - 150)
                .attr("width", 300)
                .attr("height", 300)
                .style("opacity", 0);
            if (slideDirection > 90 && slideDirection < 270)
                supermanSvg
                    .attr(
                        "xlink:href",
                        "https://live.staticflickr.com/65535/49735899041_e6c9d13323_o.png"
                    )
                    .attr(
                        "transform",
                        "rotate(" +
                            ((145 - slideDirection + 360) % 360) +
                            ", 500, 500)"
                    );
            else
                supermanSvg
                    .attr(
                        "xlink:href",
                        "https://live.staticflickr.com/65535/49735448721_e0ea4f763f_o.png"
                    )
                    .attr(
                        "transform",
                        "rotate(" +
                            ((35 - slideDirection + 360) % 360) +
                            ", 500, 500)"
                    );

            d3.transition("cloudTween_" + viewId)
                .duration(param.supermanFlyingDuration)
                .ease(d3.easeLinear)
                .tween("cloudTween", function() {
                    return function(t) {
                        travel(t);
                    };
                })
                .on("start", function() {
                    supermanSvg
                        .transition()
                        .delay(param.supermanDisplayDelay)
                        .duration(param.supermanDisplayDuration)
                        .style("opacity", 1);

                    cloudSvg
                        .transition()
                        .delay(param.supermanDisplayDelay)
                        .duration(param.supermanDisplayDuration)
                        .style("opacity", 1);

                    // schedule a zoom back transition
                    d3.transition("zoomOutTween_" + viewId)
                        .delay(
                            param.supermanFlyingDuration -
                                param.supermanEnteringTime
                        )
                        .duration(param.slideEnteringDuration)
                        .tween("zoomOutTween", function() {
                            return function(t) {
                                enter(t);
                            };
                        })
                        .ease(d3.easeSinIn)
                        .on("start", function() {
                            cloudSvg
                                .transition()
                                .duration(400)
                                .style("opacity", 0);

                            // set up layer layouts
                            setupLayerLayouts(viewId);

                            // static trim
                            renderStaticLayers(viewId);

                            // render
                            RefreshDynamicLayers(
                                viewId,
                                gvd.initialViewportX,
                                gvd.initialViewportY
                            );
                        })
                        .on("end", function() {
                            postJump(viewId, jumpType);
                        });
                })
                .on("end", function() {
                    supermanSvg.remove();
                    cloudSvg.remove();
                });
        });

    function exit(t) {
        var minx, miny;
        if (Math.abs(cos) > Math.abs(sin)) {
            minx = +curViewport[0] - curViewport[2] * t * (cos > 0 ? 1 : -1);
            miny =
                +curViewport[1] - ((curViewport[2] * t) / Math.abs(cos)) * sin;
        } else {
            miny = +curViewport[1] - curViewport[3] * t * (sin > 0 ? 1 : -1);
            minx =
                +curViewport[0] - ((curViewport[3] * t) / Math.abs(sin)) * cos;
        }

        // change viewBox of old dynamic layers
        d3.selectAll(viewClass + ".oldmainsvg:not(.static)").attr(
            "viewBox",
            minx + " " + miny + " " + curViewport[2] + " " + curViewport[3]
        );

        // change viewBox of old static layers
        if (Math.abs(cos) > Math.abs(sin)) {
            minx = -gvd.viewportWidth * t * (cos > 0 ? 1 : -1);
            miny = ((-gvd.viewportWidth * t) / Math.abs(cos)) * sin;
        } else {
            miny = -gvd.viewportHeight * t * (sin > 0 ? 1 : -1);
            minx = ((-gvd.viewportHeight * t) / Math.abs(sin)) * cos;
        }

        d3.selectAll(viewClass + ".oldmainsvg.static").attr(
            "viewBox",
            minx + " " + miny + " " + curViewport[2] + " " + curViewport[3]
        );
    }

    function enter(t) {
        var k = gvd.initialScale || 1;
        var minx, miny;
        if (Math.abs(cos) > Math.abs(sin)) {
            minx =
                gvd.initialViewportX +
                (gvd.viewportWidth * (1 - t) * (cos > 0 ? 1 : -1)) / k;
            miny =
                gvd.initialViewportY +
                (((gvd.viewportWidth * (1 - t)) / Math.abs(cos)) * sin) / k;
        } else {
            miny =
                gvd.initialViewportY +
                (gvd.viewportHeight * (1 - t) * (sin > 0 ? 1 : -1)) / k;
            minx =
                gvd.initialViewportX +
                (((gvd.viewportHeight * (1 - t)) / Math.abs(sin)) * cos) / k;
        }

        // change viewBox of dynamic layers
        d3.selectAll(viewClass + ".mainsvg:not(.static)").attr(
            "viewBox",
            minx +
                " " +
                miny +
                " " +
                gvd.viewportWidth / k +
                " " +
                gvd.viewportHeight / k
        );

        // change viewBox of static layers
        if (Math.abs(cos) > Math.abs(sin)) {
            minx = gvd.viewportWidth * (1 - t) * (cos > 0 ? 1 : -1);
            miny = ((gvd.viewportWidth * (1 - t)) / Math.abs(cos)) * sin;
        } else {
            miny = gvd.viewportHeight * (1 - t) * (sin > 0 ? 1 : -1);
            minx = ((gvd.viewportHeight * (1 - t)) / Math.abs(sin)) * cos;
        }
        d3.selectAll(viewClass + ".mainsvg.static").attr(
            "viewBox",
            minx +
                " " +
                miny +
                " " +
                gvd.viewportWidth +
                " " +
                gvd.viewportHeight
        );
    }

    function travel(t) {
        // change viewbox of static layers
        if (Math.abs(rCos) > Math.abs(rSin)) {
            minx = -gvd.viewportWidth * (1 - 2 * t) * (rCos > 0 ? 1 : -1);
            miny = ((-gvd.viewportWidth * (1 - 2 * t)) / Math.abs(rCos)) * rSin;
        } else {
            miny = -gvd.viewportHeight * (1 - 2 * t) * (rSin > 0 ? 1 : -1);
            minx =
                ((-gvd.viewportHeight * (1 - 2 * t)) / Math.abs(rSin)) * rCos;
        }
        d3.select("#cloudsvg").attr(
            "viewBox",
            minx +
                " " +
                miny +
                " " +
                gvd.viewportWidth +
                " " +
                gvd.viewportHeight
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
