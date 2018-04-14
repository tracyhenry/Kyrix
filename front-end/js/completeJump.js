// complete the jump
// 1. get current canvas object
// 2. clear jump option div
// 3. call RefreshCanvas()
function completeJump(tuple, newViewportX, newViewportY) {

    var oldSvg = d3.select("#mainSvg").attr("id", "oldSvg");

    // TODO : change all set/get attribute to d3 attr
    var curViewport = oldSvg.attr("viewBox").split(" ");
    for (var i = 0; i < curViewport.length; i ++)
        curViewport[i] = parseFloat(curViewport[i]);
    var tupleLen = tuple.length;
    var tupleCX = parseFloat(tuple[tupleLen - param.cxOffset]);
    var tupleCY = parseFloat(tuple[tupleLen - param.cyOffset]);
    var tupleWidth = parseFloat(tuple[tupleLen - param.maxxOffset]) - parseFloat(tuple[tupleLen - param.minxOffset]);
    var tupleHeight = parseFloat(tuple[tupleLen - param.maxyOffset]) - parseFloat(tuple[tupleLen - param.minyOffset]);
    var minx = Math.max(tupleCX - tupleWidth / 2, curViewport[0]);
    var maxx = Math.min(tupleCX + tupleWidth / 2, curViewport[0] + curViewport[2]);
    var miny = Math.max(tupleCY - tupleHeight / 2, curViewport[1]);
    var maxy = Math.min(tupleCY + tupleHeight / 2, curViewport[1] + curViewport[3]);

    //TODO: preloading boarder tiles should fix the problem when zooming boarder objects
    var zoomTransition = oldSvg.transition()
        .duration(param.zoomDuration)
        .tween("zoomTween", function() {

            var i = d3.interpolateZoom([curViewport[2] / 2, curViewport[3] / 2, curViewport[2]],
                                       [minx + (maxx - minx) / 2 - curViewport[0],
                                        miny + (maxy - miny) / 2 - curViewport[1],
                                        tupleWidth / param.zoomScaleFactor]);
            return function(t) {zoomAndFade(t, i(t));};
        })
        .on("start", function () {

            // get the canvas object for the destination canvas
            getCurCanvas();

            // create a new svg
            var newSvg = d3.select("#containerSvg")
                .append("svg")
                .attr("id", "mainSvg")
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
                    RefreshCanvas(newViewportX, newViewportY);
                })
                .on("end", function (){

                    // remove the old svg after animation ends
                    d3.select("#oldSvg").remove();

                    // clear the jump option div
                    globalVar.jumpOptions.node().innerHTML = '';
                });
        })


    function zoomAndFade(t, v) {

        var vWidth = v[2];
        var vHeight = globalVar.viewportHeight / globalVar.viewportWidth * vWidth;
        var minx = curViewport[0] + parseFloat(v[0]) - vWidth / 2;
        var miny = curViewport[1] + parseFloat(v[1]) - vHeight / 2;

        // change viewBox
        oldSvg.attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change opacity
        var threshold = param.fadeThreshold;
        if (t >= threshold)
            oldSvg.style("opacity", 1 - (t - threshold) / (1 - threshold));
    };

    function enterAndZoom(t) {

        var vWidth = globalVar.viewportWidth * param.enteringScaleFactor
            / (1.0 + (param.enteringScaleFactor - 1) * t)
        var vHeight = globalVar.viewportHeight * param.enteringScaleFactor
            / (1.0 + (param.enteringScaleFactor - 1) * t)
        var minx = newViewportX + globalVar.viewportWidth / 2 - vWidth / 2;
        var miny = newViewportY + globalVar.viewportHeight / 2 - vHeight / 2;

        // change viewBox
        d3.select("#mainSvg").attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);
    };

};
