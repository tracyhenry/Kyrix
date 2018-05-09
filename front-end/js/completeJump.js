function completeJump(tuple, newViewportX, newViewportY) {

    // unbind zoom
    d3.select("#maing").on(".zoom", null);

    // use transition to remove axes, static trims & popovers
    d3.select("#axesg").transition()
        .duration(param.axesOutDuration)
        .style("opacity", 0);
    d3.select("#staticg").transition()
        .duration(param.staticTrimOutDuration)
        .style("opacity", 0);
    removePopoversSmooth();

    // change #mainSvg to #oldSvg
    var oldSvg = d3.select("#mainSvg").attr("id", "oldSvg");

    // viewport math
    var curViewport = oldSvg.attr("viewBox").split(" ");
    for (var i = 0; i < curViewport.length; i ++)
        curViewport[i] = +curViewport[i];
    var tupleLen = tuple.length;
    var tupleCX = +tuple[tupleLen - param.cxOffset];
    var tupleCY = +tuple[tupleLen - param.cyOffset];
    var tupleWidth = tuple[tupleLen - param.maxxOffset] - tuple[tupleLen - param.minxOffset];
    var tupleHeight = tuple[tupleLen - param.maxyOffset] - tuple[tupleLen - param.minyOffset];
    var minx = Math.max(tupleCX - tupleWidth / 2.0, curViewport[0]);
    var maxx = Math.min(tupleCX + tupleWidth / 2.0, curViewport[0] + curViewport[2]);
    var miny = Math.max(tupleCY - tupleHeight / 2.0, curViewport[1]);
    var maxy = Math.min(tupleCY + tupleHeight / 2.0, curViewport[1] + curViewport[3]);

    var zoomTransition = oldSvg.transition()
        .duration(param.zoomDuration)
        .tween("zoomTween", function() {

            var i = d3.interpolateZoom([curViewport[2] / 2.0, curViewport[3] / 2.0, curViewport[2]],
                                       [minx + (maxx - minx) / 2.0 - curViewport[0],
                                        miny + (maxy - miny) / 2.0 - curViewport[1],
                                        tupleWidth / param.zoomScaleFactor]);
            return function(t) {zoomAndFade(t, i(t));};
        })
        .on("start", function () {

            // create a new svg
            var newSvg = d3.select("#maing")
                .append("svg")
                .attr("id", "mainSvg")
                .attr("preserveAspectRatio", "none")
                .attr("width", globalVar.viewportWidth)
                .attr("height", globalVar.viewportHeight)
                .attr("x", 0)
                .attr("y", 0)
                .attr("viewBox", "0 0"
                    + " " + globalVar.viewportWidth * param.enteringScaleFactor
                    + " " + globalVar.viewportHeight * param.enteringScaleFactor);

            // schedule a new entering transition
            newSvg.transition()
                .delay(param.enteringDelay)
                .duration(param.enteringDuration)
                .tween("enterTween", function() {

                    return function(t) {enterAndZoom(d3.easeExpOut(t));};
                })
                .on("start", function() {

                    // set initial global var initialViewportX/Y
                    globalVar.initialViewportX = newViewportX;
                    globalVar.initialViewportY = newViewportY;

                    // get the canvas object for the destination canvas
                    getCurCanvas();

                    // render
                    RefreshCanvas(newViewportX, newViewportY);
                })
                .on("end", function (){

                    // remove the old svg after animation ends
                    d3.select("#oldSvg").remove();

                    // set the viewBox of the new main svg
                    // because d3 tween does not get t to 1.0
                    d3.select(this).attr("viewBox", newViewportX + " "
                        + newViewportY + " "
                        + globalVar.viewportWidth + " "
                        + globalVar.viewportHeight);

                    // display axes
                    d3.select("#axesg").transition()
                        .duration(param.axesInDuration)
                        .style("opacity", 1);

                    // render & display static trim
                    renderStaticTrim();
                    d3.select("#staticg")
                        .style("opacity", 0)
                        .transition()
                        .duration(param.staticTrimInDuration)
                        .style("opacity", 1);

                    // set up zoom
                    setupZoom(1);
                });
        });

    function zoomAndFade(t, v) {

        var vWidth = v[2];
        var vHeight = globalVar.viewportHeight / globalVar.viewportWidth * vWidth;
        var minx = curViewport[0] + v[0] - vWidth / 2.0;
        var miny = curViewport[1] + v[1] - vHeight / 2.0;

        // change viewBox
        oldSvg.attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change opacity
        var threshold = param.fadeThreshold;
        if (t >= threshold)
            oldSvg.style("opacity", 1.0 - (t - threshold) / (1.0 - threshold));
    };

    function enterAndZoom(t) {

        var vWidth = globalVar.viewportWidth * param.enteringScaleFactor
            / (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var vHeight = globalVar.viewportHeight * param.enteringScaleFactor
            / (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var minx = newViewportX + globalVar.viewportWidth / 2.0 - vWidth / 2.0;
        var miny = newViewportY + globalVar.viewportHeight / 2.0 - vHeight / 2.0;

        // change viewBox
        d3.select("#mainSvg")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);
    };
};
