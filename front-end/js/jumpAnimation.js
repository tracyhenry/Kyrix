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
        d3.selectAll(viewClass + ".mainsvg:not(.static)").attr(
            "viewBox",
            minx +
                " " +
                miny +
                " " +
                gvd.viewportWidth / newScale +
                " " +
                gvd.viewportHeight / newScale
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
