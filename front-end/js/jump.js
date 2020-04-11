function removePopovers(viewId) {
    var selector = ".popover,.kyrixtooltip";
    if (viewId != null) selector += ".view_" + viewId;
    d3.selectAll(selector).remove();
}

function removePopoversSmooth(viewId) {
    var selector = ".popover,.kyrixtooltip";
    if (viewId != null) selector += ".view_" + viewId;
    d3.selectAll(selector)
        .transition()
        .duration(param.popoverOutDuration)
        .style("opacity", 0)
        .remove();
}

// disable and remove stuff before jump
function preJump(viewId, jump) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // execute jumpstart events
    if (gvd.onJumpstartHandlers != null) {
        var subEvts = Object.keys(gvd.onJumpstartHandlers);
        for (var subEvt of subEvts)
            if (typeof gvd.onJumpstartHandlers[subEvt] == "function")
                gvd.onJumpstartHandlers[subEvt](jump);
    }

    // unbind zoom
    d3.select(viewClass + ".maing").on(".zoom", null);

    // use transition to remove axes, static trims & popovers
    d3.select(viewClass + ".axesg")
        .transition()
        .duration(param.axesOutDuration)
        .style("opacity", 0);
    removePopoversSmooth(viewId);

    // change .mainsvg to .oldmainsvg, and .layerg to .oldlayerg
    d3.selectAll(viewClass + ".oldlayerg").remove();
    d3.selectAll(viewClass + ".layerg")
        .classed("layerg", false)
        .classed("oldlayerg", true);

    d3.selectAll(viewClass + ".mainsvg")
        .classed("mainsvg", false)
        .classed("oldmainsvg", true);

    // remove cursor pointers and onclick listeners
    d3.select(viewClass + ".viewsvg")
        .selectAll("*")
        .style("cursor", "auto")
        .on("click", null)
        .on("mouseover", null)
        .on("mouseout", null)
        .on("mousemove", null);
    d3.selectAll("button" + viewClass).attr("disabled", true);

    gvd.animation = jump.type;
    gvd.initialScale = null;
}

function postJump(viewId, jump) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;
    var jumpType = jump.type;

    function postOldLayerRemoval() {
        // set up zoom
        if (jumpType == param.literalZoomOut)
            setupZoom(
                viewId,
                Math.max(
                    gvd.curCanvas.zoomInFactorX,
                    gvd.curCanvas.zoomInFactorY
                ) - param.eps
            );
        // hardcode for load for now
        // in the future we shouldn't need these if-elses
        // gvd.initialScale should be set prior to all jumps.
        // relevant: https://github.com/tracyhenry/Kyrix/issues/12
        else setupZoom(viewId, gvd.initialScale || 1);

        // set up button states
        setBackButtonState(viewId);

        // animation stopped now
        gvd.animation = false;

        // register jumps after every jump
        // reason: some coordination-based jumps maybe become applicable after a jump
        for (var i = 0; i < globalVar.project.views.length; i++) {
            var nViewId = globalVar.project.views[i].id;
            var nGvd = globalVar.views[nViewId];
            var nViewClass = ".view_" + nViewId;
            for (var j = 0; j < nGvd.curCanvas.layers.length; j++) {
                var curLayer = nGvd.curCanvas.layers[j];
                if (!curLayer.isStatic && curLayer.fetchingScheme == "tiling")
                    d3.select(nViewClass + ".layerg.layer" + j)
                        .select("svg")
                        .selectAll(".lowestsvg")
                        .each(function() {
                            registerJumps(nViewId, d3.select(this), j);
                        });
                else
                    registerJumps(
                        nViewId,
                        d3
                            .select(nViewClass + ".layerg.layer" + j)
                            .select("svg"),
                        j
                    );
            }
        }
    }

    // set the viewBox & opacity of the new .mainsvgs
    // because d3 tween does not get t to 1.0
    d3.selectAll(viewClass + ".mainsvg:not(.static)")
        .attr(
            "viewBox",
            gvd.initialViewportX +
                " " +
                gvd.initialViewportY +
                " " +
                gvd.viewportWidth +
                " " +
                gvd.viewportHeight
        )
        .style("opacity", 1);
    d3.selectAll(viewClass + ".mainsvg.static")
        .attr("viewBox", "0 0 " + gvd.viewportWidth + " " + gvd.viewportHeight)
        .style("opacity", 1);

    // display axes
    d3.select(viewClass + ".axesg")
        .transition()
        .duration(param.axesInDuration)
        .style("opacity", 1);

    // remove old layers if appropriate
    for (var i = 0; i < gvd.curCanvas.layers.length; i++)
        if (gvd.curCanvas.layers[i].isStatic)
            d3.selectAll(viewClass + ".oldlayerg" + ".layer" + i).remove();
    if (
        !(
            jumpType == param.geometricSemanticZoom ||
            jumpType == param.literalZoomIn ||
            jumpType == param.literalZoomOut ||
            jumpType == param.load
        )
    )
        d3.selectAll(viewClass + ".oldlayerg").remove();
    postOldLayerRemoval();

    // execute on jump handlers
    if (gvd.onJumpendHandlers != null) {
        var subEvts = Object.keys(gvd.onJumpendHandlers);
        for (var subEvt of subEvts)
            if (typeof gvd.onJumpendHandlers[subEvt] == "function")
                gvd.onJumpendHandlers[subEvt](jump);
    }
}

// animate semantic zoom
function semanticZoom(viewId, jump, predArray, newVpX, newVpY, tuple) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // log history
    logHistory(viewId, jump);

    // change global vars
    gvd.curCanvasId = jump.destId;
    gvd.predicates = predArray;
    gvd.highlightPredicates = [];
    gvd.initialViewportX = newVpX;
    gvd.initialViewportY = newVpY;

    // prefetch canvas object by sending an async request to server
    var postData = "id=" + gvd.curCanvasId;
    for (var i = 0; i < gvd.predicates.length; i++)
        postData += "&predicate" + i + "=" + getSqlPredicate(gvd.predicates[i]);
    if (!(postData in globalVar.cachedCanvases)) {
        $.ajax({
            type: "GET",
            url: globalVar.serverAddr + "/canvas",
            data: postData,
            success: function(data, status) {
                if (!(postData in globalVar.cachedCanvases)) {
                    globalVar.cachedCanvases[postData] = {};
                    globalVar.cachedCanvases[postData].canvasObj = JSON.parse(
                        data
                    ).canvas;
                    globalVar.cachedCanvases[postData].jumps = JSON.parse(
                        data
                    ).jump;
                    globalVar.cachedCanvases[postData].staticData = JSON.parse(
                        data
                    ).staticData;
                }
            },
            async: true
        });
    }

    // disable stuff before animation
    preJump(viewId, jump);

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

function animateSlide(viewId, jump, predArray, newVpX, newVpY) {
    // TODO:!!
    // lots of stuff in this func is duplicate to semantic zoom
    // just making it easier for merge with master
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // log history
    logHistory(viewId, jump);

    // change global vars
    gvd.curCanvasId = jump.destId;
    gvd.predicates = predArray;
    gvd.highlightPredicates = [];
    gvd.initialViewportX = newVpX;
    gvd.initialViewportY = newVpY;

    // prefetch canvas object by sending an async request to server
    var postData = "id=" + gvd.curCanvasId;
    for (var i = 0; i < gvd.predicates.length; i++)
        postData += "&predicate" + i + "=" + getSqlPredicate(gvd.predicates[i]);
    if (!(postData in globalVar.cachedCanvases)) {
        $.ajax({
            type: "GET",
            url: globalVar.serverAddr + "/canvas",
            data: postData,
            success: function(data, status) {
                if (!(postData in globalVar.cachedCanvases)) {
                    globalVar.cachedCanvases[postData] = {};
                    globalVar.cachedCanvases[postData].canvasObj = JSON.parse(
                        data
                    ).canvas;
                    globalVar.cachedCanvases[postData].jumps = JSON.parse(
                        data
                    ).jump;
                    globalVar.cachedCanvases[postData].staticData = JSON.parse(
                        data
                    ).staticData;
                }
            },
            async: true
        });
    }

    // pre jump
    // disable stuff before animation
    preJump(viewId, jump);
    var jumpType = jump.type;

    // curViewport
    var curViewport = [0, 0, gvd.viewportWidth, gvd.viewportHeight];
    if (d3.select(viewClass + ".oldmainsvg:not(.static)").size())
        curViewport = d3
            .select(viewClass + ".oldmainsvg:not(.static)")
            .attr("viewBox")
            .split(" ");
    for (var i = 0; i < curViewport.length; i++)
        curViewport[i] = +curViewport[i];

    // start transition
    var dir = ((360 - jump.slideDirection) / 180) * Math.PI;
    var cos = Math.cos(dir);
    var sin = Math.sin(dir);
    d3.transition("zoomInTween_" + viewId)
        .duration(
            param.slideExitDuration / Math.max(Math.abs(cos), Math.abs(sin))
        )
        .tween("zoomInTween", function() {
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
                                (jump.slideDirection > 90 &&
                                jump.slideDirection < 270
                                    ? 360 - ((jump.slideDirection + 180) % 360)
                                    : 360 - jump.slideDirection) +
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
            if (jump.slideDirection > 90 && jump.slideDirection < 270)
                supermanSvg
                    .attr(
                        "xlink:href",
                        "https://live.staticflickr.com/65535/49735899041_e6c9d13323_o.png"
                    )
                    .attr(
                        "transform",
                        "rotate(" +
                            ((145 - jump.slideDirection + 360) % 360) +
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
                            ((35 - jump.slideDirection + 360) % 360) +
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

                    // schedule a new entering transition
                    d3.transition("enterTween_" + viewId)
                        .delay(
                            param.supermanFlyingDuration -
                                param.supermanEnteringTime
                        )
                        .duration(param.slideEnteringDuration)
                        .ease(d3.easeSinIn)
                        .tween("enterTween", function() {
                            return function(t) {
                                enter(t);
                            };
                        })
                        .on("start", function() {
                            cloudSvg
                                .transition()
                                .duration(400)
                                .style("opacity", 0);

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
                    supermanSvg.remove();
                    cloudSvg.remove();
                });
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
        d3.selectAll(viewClass + ".oldmainsvg:not(.static)").attr(
            "viewBox",
            minx + " " + miny + " " + curViewport[2] + " " + curViewport[3]
        );

        // change viewBox of static layers
        if (Math.abs(cos) > Math.abs(sin)) {
            minx = gvd.viewportWidth * t * (cos > 0 ? 1 : -1);
            miny = ((gvd.viewportWidth * t) / Math.abs(cos)) * sin;
        } else {
            miny = gvd.viewportHeight * t * (sin > 0 ? 1 : -1);
            minx = ((gvd.viewportHeight * t) / Math.abs(sin)) * cos;
        }
        d3.selectAll(viewClass + ".oldmainsvg.static").attr(
            "viewBox",
            minx +
                " " +
                miny +
                " " +
                gvd.viewportWidth +
                " " +
                gvd.viewportWidth
        );
    }

    function enter(t) {
        // TODO: right now this assumes initial scale is 1
        var minx, miny;
        if (Math.abs(cos) > Math.abs(sin)) {
            minx = newVpX - curViewport[2] * (1 - t) * (cos > 0 ? 1 : -1);
            miny = newVpY - ((curViewport[2] * (1 - t)) / Math.abs(cos)) * sin;
        } else {
            miny = newVpY - curViewport[3] * (1 - t) * (sin > 0 ? 1 : -1);
            minx = newVpX - ((curViewport[3] * (1 - t)) / Math.abs(sin)) * cos;
        }

        // change viewBox of dynamic layers
        d3.selectAll(viewClass + ".mainsvg:not(.static)").attr(
            "viewBox",
            minx +
                " " +
                miny +
                " " +
                gvd.viewportWidth +
                " " +
                gvd.viewportHeight
        );

        // change viewbox of static layers
        if (Math.abs(cos) > Math.abs(sin)) {
            minx = -gvd.viewportWidth * (1 - t) * (cos > 0 ? 1 : -1);
            miny = ((-gvd.viewportWidth * (1 - t)) / Math.abs(cos)) * sin;
        } else {
            miny = -gvd.viewportHeight * (1 - t) * (sin > 0 ? 1 : -1);
            minx = ((-gvd.viewportHeight * (1 - t)) / Math.abs(sin)) * cos;
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

function load(predArray, newVpX, newVpY, newScale, viewId, canvasId, jump) {
    var destViewId = viewId;

    // stop any tweens
    d3.selection().interrupt("zoomInTween_" + destViewId);
    d3.selection().interrupt("enterTween_" + destViewId);
    d3.selection().interrupt("zoomOutTween_" + destViewId);
    d3.selection().interrupt("fadeTween_" + destViewId);
    d3.selection().interrupt("literalTween_" + destViewId);

    // reset global vars
    var gvd = globalVar.views[destViewId];
    gvd.curCanvasId = canvasId;
    gvd.predicates = predArray;
    gvd.highlightPredicates = [];
    gvd.initialViewportX = newVpX;
    gvd.initialViewportY = newVpY;
    gvd.initialScale = newScale;
    gvd.renderData = null;
    gvd.pendingBoxRequest = null;
    gvd.history = [];

    // pre animation
    preJump(destViewId, jump);

    // draw buttons because they were not created if it was an empty view
    drawZoomButtons(destViewId);

    // fetch static data from server, then render the view
    var gotCanvas = getCurCanvas(destViewId);
    gotCanvas.then(function() {
        // render static layers
        renderStaticLayers(destViewId);
        // post animation
        postJump(destViewId, jump);
    });
}

function highlight(predArray, jump) {
    var destViewId = jump.destViewId;
    var gvd = globalVar.views[destViewId];
    if (gvd.curCanvasId != jump.destId) return;
    gvd.highlightPredicates = predArray;
    for (var i = 0; i < gvd.curCanvas.layers.length; i++)
        d3.selectAll(".view_" + destViewId + ".layerg.layer" + i)
            .selectAll(".lowestsvg")
            .each(function() {
                highlightLowestSvg(destViewId, d3.select(this), i);
            });
}

// trigger jump on object [d], assuming this jump is applicable on d
function startJump(viewId, d, jump, optionalArgs) {
    removePopovers(viewId);

    // calculate new predicates
    var predDict = jump.predicates.parseFunction()(d, optionalArgs);
    var predArray = [];
    var numLayer = getCanvasById(jump.destId).layers.length;
    for (var i = 0; i < numLayer; i++)
        if ("layer" + i in predDict) predArray.push(predDict["layer" + i]);
        else predArray.push({});

    // calculate new viewport
    var newVpX, newVpY;
    if (jump.viewport.length > 0) {
        var viewportFunc = jump.viewport.parseFunction();
        var viewportFuncRet = viewportFunc(d, optionalArgs);

        if ("constant" in viewportFuncRet) {
            // constant viewport, no predicate
            newVpX = viewportFuncRet["constant"][0];
            newVpY = viewportFuncRet["constant"][1];
        } else if ("centroid" in viewportFuncRet) {
            //TODO: this is not tested
            // viewport is fixed at a certain tuple
            var postData = "canvasId=" + jump.destId;
            var predDict = viewportFuncRet["centroid"];
            for (var i = 0; i < numLayer; i++)
                if ("layer" + i in predDict)
                    postData +=
                        "&predicate" +
                        i +
                        "=" +
                        getSqlPredicate(predDict["layer" + i]);
                else postData += "&predicate" + i + "=";
            $.ajax({
                type: "GET",
                url: globalVar.serverAddr + "/viewport",
                data: postData,
                success: function(data, status) {
                    var cx = JSON.parse(data).cx;
                    var cy = JSON.parse(data).cy;
                    newVpX = cx - gvd.viewportWidth / 2;
                    newVpY = cy - gvd.viewportHeight / 2;
                },
                async: false
            });
        } else
            throw new Error("Unrecognized new viewport function return value.");
    }

    if (
        jump.type == param.semanticZoom ||
        jump.type == param.geometricSemanticZoom
    )
        semanticZoom(viewId, jump, predArray, newVpX, newVpY, d);
    else if (jump.type == param.slide)
        animateSlide(viewId, jump, predArray, newVpX, newVpY);
    else if (jump.type == param.load)
        load(predArray, newVpX, newVpY, 1, jump.destViewId, jump.destId);
    else if (jump.type == param.highlight) highlight(predArray, jump);
}

// register jump info
function registerJumps(viewId, svg, layerId) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    var jumps = gvd.curJump;
    var shapes = svg.select("g:last-of-type").selectAll("*");
    var optionalArgs = getOptionalArgs(viewId);
    optionalArgs["layerId"] = layerId;

    shapes.each(function(p) {
        // check if this shape has jumps
        var hasJump = false;
        for (var k = 0; k < jumps.length; k++)
            if (
                (jumps[k].type == param.semanticZoom ||
                    jumps[k].type == param.geometricSemanticZoom ||
                    jumps[k].type == param.slide ||
                    (jumps[k].type == param.load &&
                        jumps[k].sourceViewId == viewId) ||
                    (jumps[k].type == param.highlight &&
                        jumps[k].sourceViewId == viewId &&
                        globalVar.views[jumps[k].destViewId].curCanvasId ==
                            jumps[k].destId)) &&
                jumps[k].selector.parseFunction()(p, optionalArgs)
            ) {
                hasJump = true;
                break;
            }
        if (!hasJump) return;

        // make cursor a hand when hovering over this shape
        d3.select(this).style("cursor", "zoom-in");

        // register onclick listener
        d3.select(this).on("click", function(d) {
            // stop the click event from propagating up
            d3.event.stopPropagation();

            // remove all popovers first
            removePopovers(viewId);

            // create a jumpoption popover using bootstrap
            d3.select(".kyrixdiv")
                .append("div")
                .classed("view_" + viewId + " popover fade right in", true)
                .attr("role", "tooltip")
                .attr("id", "jumppopover")
                .append("div")
                .classed("view_" + viewId + " arrow popoverarrow", true)
                .attr("id", "popoverarrow");
            d3.select(viewClass + "#jumppopover")
                .append("h2")
                .classed("view_" + viewId + " popover-title", true)
                .attr("id", "popovertitle")
                .html("Jump Options")
                .append("a")
                .classed("view_" + viewId + " close", true)
                .attr("href", "#")
                .attr("id", "popoverclose")
                .html("&times;")
                .on("click", function() {
                    removePopovers(viewId);
                });
            d3.select(viewClass + "#jumppopover")
                .append("div")
                .classed("view_" + viewId + " popover-content list-group", true)
                .attr("id", "popovercontent");

            // add jump options
            for (var k = 0; k < jumps.length; k++) {
                // check if this jump is applied in this layer
                if (
                    (jumps[k].type != param.semanticZoom &&
                        jumps[k].type != param.geometricSemanticZoom &&
                        jumps[k].type != param.slide &&
                        (jumps[k].type != param.load ||
                            jumps[k].sourceViewId != viewId) &&
                        (jumps[k].type != param.highlight ||
                            jumps[k].sourceViewId != viewId ||
                            globalVar.views[jumps[k].destViewId].curCanvasId !=
                                jumps[k].destId)) ||
                    !jumps[k].selector.parseFunction()(d, optionalArgs)
                )
                    continue;

                // create table cell and append it to #popovercontent
                var optionText = "<b>ZOOM IN </b>";
                if (jumps[k].type == param.load)
                    optionText =
                        "<b>LOAD " + jumps[k].destViewId + " VIEW with </b>";
                else if (jumps[k].type == param.highlight)
                    optionText =
                        "<b>HIGHLIGHT in " + jumps[k].destViewId + " VIEW </b>";
                if (jumps[k].noPrefix == true) {
                    optionText = "";
                }
                optionText +=
                    jumps[k].name.parseFunction() == null
                        ? jumps[k].name
                        : jumps[k].name.parseFunction()(d, optionalArgs);
                var jumpOption = d3
                    .select(viewClass + "#popovercontent")
                    .append("a")
                    .classed("list-group-item", true)
                    .attr("href", "#")
                    .datum(d)
                    .attr("data-jump-id", k)
                    .html(optionText);

                // on click
                jumpOption.on("click", function(d) {
                    d3.event.preventDefault();
                    var jump = jumps[d3.select(this).attr("data-jump-id")];
                    startJump(viewId, d, jump, optionalArgs);
                });
            }

            // position jump popover according to event x/y and its width/height
            var popoverHeight = d3
                .select(viewClass + "#jumppopover")
                .node()
                .getBoundingClientRect().height;
            d3.select(viewClass + "#jumppopover")
                .style("left", d3.event.pageX + "px")
                .style("top", d3.event.pageY - popoverHeight / 2 + "px");
        });
    });
}
