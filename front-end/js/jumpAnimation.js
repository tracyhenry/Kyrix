function animateSemanticZoom(viewId, jump, newVpX, newVpY, tuple) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // whether this semantic zoom is also geometric
    var enteringAnimation = jump.type == param.semanticZoom ? true : false;

    // calculate tuple boundary
    var curViewport = [0, 0, gvd.viewportWidth, gvd.viewportHeight];
    if (d3.select(viewClass + ".oldmainsvg:not(.static)").size())
        curViewport = d3
            .select(viewClass + ".oldmainsvg:not(.static)")
            .attr("viewBox")
            .split(" ");
    for (var i = 0; i < curViewport.length; i++)
        curViewport[i] = +curViewport[i];
    if (
        !("minx" in tuple) ||
        !("miny" in tuple) ||
        !("maxx" in tuple) ||
        !("maxy" in tuple)
    )
        tuple.minx = tuple.miny = tuple.maxx = tuple.maxy = 0;
    var tupleWidth = +tuple.maxx - tuple.minx;
    var tupleHeight = +tuple.maxy - tuple.miny;
    var minx, maxx, miny, maxy;
    if (tupleWidth == 0 || tupleHeight == 0) {
        // check when placement func does not exist
        minx = gvd.curCanvas.w;
        miny = gvd.curCanvas.h;
        maxx = maxy = 0;
        d3.select(viewClass + ".viewsvg")
            .selectAll("*")
            .filter(function(d) {
                return d == tuple;
            })
            .each(function() {
                var bbox = this.getBBox();
                minx = Math.min(minx, bbox.x);
                miny = Math.min(miny, bbox.y);
                maxx = Math.max(maxx, bbox.x + bbox.width);
                maxy = Math.max(maxy, bbox.y + bbox.height);
            });
    } else {
        minx = +tuple.cx - tupleWidth / 2.0;
        maxx = +tuple.cx + tupleWidth / 2.0;
        miny = +tuple.cy - tupleHeight / 2.0;
        maxy = +tuple.cy + tupleHeight / 2.0;
    }

    // use tuple boundary to calculate start and end views, and log them to the last history object
    var startView = [
        curViewport[2] / 2.0,
        curViewport[3] / 2.0,
        curViewport[2]
    ];
    var endView = [
        minx + (maxx - minx) / 2.0 - curViewport[0],
        miny + (maxy - miny) / 2.0 - curViewport[1],
        (maxx - minx) / (enteringAnimation ? param.semanticZoomScaleFactor : 1)
    ];
    gvd.history[gvd.history.length - 1].startView = startView;
    gvd.history[gvd.history.length - 1].endView = endView;

    // set up zoom transitions
    param.zoomDuration = d3.interpolateZoom(startView, endView).duration;
    param.enteringDelay = Math.round(
        param.zoomDuration * param.semanticZoomEnteringDelta
    );
    d3.transition("zoomInTween_" + viewId)
        .duration(param.zoomDuration)
        .tween("zoomInTween", function() {
            var i = d3.interpolateZoom(startView, endView);
            return function(t) {
                zoomAndFade(t, i(t));
            };
        })
        .ease(d3.easeSinOut)
        .on("start", function() {
            // schedule a new entering transition
            if (enteringAnimation)
                d3.transition("enterTween_" + viewId)
                    .delay(param.enteringDelay)
                    .duration(param.semanticZoomEnteringDuration)
                    .tween("enterTween", function() {
                        return function(t) {
                            enterAndScale(d3.easeCircleOut(t));
                        };
                    })
                    .on("start", function() {
                        // get the canvas object for the destination canvas
                        var gotCanvas = getCurCanvas(viewId);
                        gotCanvas.then(function() {
                            // static trim
                            renderStaticLayers(viewId);

                            // render
                            RefreshDynamicLayers(viewId, newVpX, newVpY);
                        });
                    })
                    .on("end", function() {
                        postJump(viewId, jump);
                    });
        })
        .on("end", function() {
            if (!enteringAnimation) {
                // get the canvas object for the destination canvas
                var gotCanvas = getCurCanvas(viewId);
                gotCanvas.then(function() {
                    // static trim
                    renderStaticLayers(viewId);

                    // render
                    RefreshDynamicLayers(viewId, newVpX, newVpY);

                    // clean up
                    postJump(viewId, jump);
                });
            }
        });

    function zoomAndFade(t, v) {
        var vWidth = v[2];
        var vHeight = (gvd.viewportHeight / gvd.viewportWidth) * vWidth;
        var minx = curViewport[0] + v[0] - vWidth / 2.0;
        var miny = curViewport[1] + v[1] - vHeight / 2.0;

        // change viewBox of dynamic layers
        d3.selectAll(viewClass + ".oldmainsvg:not(.static)").attr(
            "viewBox",
            minx + " " + miny + " " + vWidth + " " + vHeight
        );

        // change viewBox of static layers
        minx = v[0] - vWidth / 2.0;
        miny = v[1] - vHeight / 2.0;
        var k = gvd.viewportWidth / curViewport[2];
        d3.selectAll(viewClass + ".oldmainsvg.static").attr(
            "viewBox",
            minx * k + " " + miny * k + " " + vWidth * k + " " + vHeight * k
        );

        // change opacity
        if (enteringAnimation) {
            var threshold = param.fadeThreshold;
            if (t >= threshold) {
                d3.selectAll(viewClass + ".oldmainsvg").style(
                    "opacity",
                    1.0 - (t - threshold) / (1.0 - threshold)
                );
            }
        }
    }

    function enterAndScale(t) {
        var vWidth =
            (gvd.viewportWidth * param.enteringScaleFactor) /
            (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var vHeight =
            (gvd.viewportHeight * param.enteringScaleFactor) /
            (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var minx = newVpX + gvd.viewportWidth / 2.0 - vWidth / 2.0;
        var miny = newVpY + gvd.viewportHeight / 2.0 - vHeight / 2.0;

        // change viewBox of dynamic layers
        d3.selectAll(viewClass + ".mainsvg:not(.static)").attr(
            "viewBox",
            minx + " " + miny + " " + vWidth + " " + vHeight
        );

        // change viewbox of static layers
        minx = gvd.viewportWidth / 2 - vWidth / 2;
        miny = gvd.viewportHeight / 2 - vHeight / 2;
        d3.selectAll(viewClass + ".mainsvg.static").attr(
            "viewBox",
            minx + " " + miny + " " + vWidth + " " + vHeight
        );

        // change opacity
        d3.selectAll(viewClass + ".mainsvg").style("opacity", t);
    }
}

function animateBackspaceSemanticZoom(viewId, jump, startView, endView) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // get current viewport
    var curViewport = [0, 0, gvd.viewportWidth, gvd.viewportHeight];
    if (d3.select(viewClass + ".oldmainsvg:not(.static)").size())
        curViewport = d3
            .select(viewClass + ".oldmainsvg:not(.static)")
            .attr("viewBox")
            .split(" ");

    // whether this semantic zoom is also geometric
    var fadingAnimation = jump.type == param.semanticZoom ? true : false;

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
        var zoomDuration = d3.interpolateZoom(endView, startView).duration;
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
                var i = d3.interpolateZoom(endView, startView);
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
                postJump(viewId, jump);
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

function animateSlide(viewId, slideDirection, newVpX, newVpY, newScale, jump) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // curViewport
    var curViewport = [0, 0, gvd.viewportWidth, gvd.viewportHeight];
    if (d3.select(viewClass + ".oldmainsvg:not(.static)").size())
        curViewport = d3
            .select(viewClass + ".oldmainsvg:not(.static)")
            .attr("viewBox")
            .split(" ");
    for (var i = 0; i < curViewport.length; i++)
        curViewport[i] = +curViewport[i];

    // setup direction, sine and cosine
    var dir = ((360 - slideDirection) / 180) * Math.PI;
    var cos = Math.cos(dir);
    var sin = Math.sin(dir);

    // start transition
    // exit transition
    d3.transition("zoomInTween_" + viewId)
        .duration(
            //param.slideExitDuration / Math.max(Math.abs(cos), Math.abs(sin))
            param.slideEnteringDuration
        )
        .tween("zoomInTween", function() {
            return function(t) {
                exit(t);
            };
        })
        .ease(d3.easeSinOut);

    if (jump.slideSuperman) {
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
                        ", " +
                        gvd.viewportWidth / 2 +
                        ", " +
                        gvd.viewportHeight / 2 +
                        ")"
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
                        ", " +
                        gvd.viewportWidth / 2 +
                        ", " +
                        gvd.viewportHeight / 2 +
                        ")"
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
            })
            .on("end", function() {
                supermanSvg.remove();
                cloudSvg.remove();
            });
    }

    // schedule a new entering transition
    d3.transition("enterTween_" + viewId)
        .delay(
            jump.slideSuperman
                ? param.supermanFlyingDuration - param.supermanEnteringTime
                : param.slideSwitchDelay
        )
        .duration(param.slideEnteringDuration)
        .ease(d3.easeSinIn)
        .tween("enterTween", function() {
            return function(t) {
                enter(t);
            };
        })
        .on("start", function() {
            if (jump.slideSuperman) {
                cloudSvg
                    .transition()
                    .duration(400)
                    .style("opacity", 0);
            }

            // get the canvas object for the destination canvas
            var gotCanvas = getCurCanvas(viewId);
            gotCanvas.then(function() {
                // static trim
                renderStaticLayers(viewId);

                // render
                RefreshDynamicLayers(viewId, newVpX, newVpY);
            });
        })
        .on("end", function() {
            postJump(viewId, jump);
        });

    function exit(t) {
        var minx, miny;
        if (Math.abs(cos) > Math.abs(sin)) {
            minx = curViewport[0] + curViewport[2] * t * (cos > 0 ? 1 : -1);
            miny =
                curViewport[1] + ((curViewport[2] * t) / Math.abs(cos)) * sin;
        } else {
            miny = curViewport[1] + curViewport[3] * t * (sin > 0 ? 1 : -1);
            minx =
                curViewport[0] + ((curViewport[3] * t) / Math.abs(sin)) * cos;
        }

        // change viewBox of dynamic layers
        d3.selectAll(viewClass + ".oldmainsvg:not(.static)")
            .attr(
                "viewBox",
                minx + " " + miny + " " + curViewport[2] + " " + curViewport[3]
            )
            .style("opacity", 1 - t);

        // change viewBox of static layers
        if (Math.abs(cos) > Math.abs(sin)) {
            minx = gvd.viewportWidth * t * (cos > 0 ? 1 : -1);
            miny = ((gvd.viewportWidth * t) / Math.abs(cos)) * sin;
        } else {
            miny = gvd.viewportHeight * t * (sin > 0 ? 1 : -1);
            minx = ((gvd.viewportHeight * t) / Math.abs(sin)) * cos;
        }
        d3.selectAll(viewClass + ".oldmainsvg.static")
            .attr(
                "viewBox",
                minx +
                    " " +
                    miny +
                    " " +
                    gvd.viewportWidth +
                    " " +
                    gvd.viewportWidth
            )
            .style("opacity", 1 - t);
    }

    function enter(t) {
        var minx, miny;
        if (Math.abs(cos) > Math.abs(sin)) {
            minx =
                newVpX -
                (curViewport[2] * (1 - t) * (cos > 0 ? 1 : -1)) / newScale;
            miny =
                newVpY -
                (((curViewport[2] * (1 - t)) / Math.abs(cos)) * sin) / newScale;
        } else {
            miny =
                newVpY -
                (curViewport[3] * (1 - t) * (sin > 0 ? 1 : -1)) / newScale;
            minx =
                newVpX -
                (((curViewport[3] * (1 - t)) / Math.abs(sin)) * cos) / newScale;
        }

        // change viewBox of dynamic layers
        d3.selectAll(viewClass + ".mainsvg:not(.static)")
            .attr(
                "viewBox",
                minx +
                    " " +
                    miny +
                    " " +
                    gvd.viewportWidth / newScale +
                    " " +
                    gvd.viewportHeight / newScale
            )
            .style("opacity", t);

        // change viewbox of static layers
        if (Math.abs(cos) > Math.abs(sin)) {
            minx = -gvd.viewportWidth * (1 - t) * (cos > 0 ? 1 : -1);
            miny = ((-gvd.viewportWidth * (1 - t)) / Math.abs(cos)) * sin;
        } else {
            miny = -gvd.viewportHeight * (1 - t) * (sin > 0 ? 1 : -1);
            minx = ((-gvd.viewportHeight * (1 - t)) / Math.abs(sin)) * cos;
        }
        d3.selectAll(viewClass + ".mainsvg.static")
            .attr(
                "viewBox",
                minx +
                    " " +
                    miny +
                    " " +
                    gvd.viewportWidth +
                    " " +
                    gvd.viewportHeight
            )
            .style("opacity", t);
    }

    function travel(t) {
        // change viewbox of static layers
        var minx, miny;
        if (Math.abs(cos) > Math.abs(sin)) {
            minx = -gvd.viewportWidth * (1 - 2 * t) * (cos > 0 ? 1 : -1);
            miny = ((-gvd.viewportWidth * (1 - 2 * t)) / Math.abs(cos)) * sin;
        } else {
            miny = -gvd.viewportHeight * (1 - 2 * t) * (sin > 0 ? 1 : -1);
            minx = ((-gvd.viewportHeight * (1 - 2 * t)) / Math.abs(sin)) * cos;
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
