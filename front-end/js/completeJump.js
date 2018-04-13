// complete the jump
// 1. get current canvas object
// 2. clear jump option div
// 3. call RefreshCanvas()
function completeJump(tuple, newViewportX, newViewportY) {

    // TODO : change all set/get attribute to d3 attr
    var viewport = d3.select("#mainSvg").attr("viewBox").split(" ");
    for (var i = 0; i < viewport.length; i ++)
        viewport[i] = parseFloat(viewport[i]);
    var tupleLen = tuple.length;
    var tupleCX = parseFloat(tuple[tupleLen - 6]); // TODO: get rid of magic number
    var tupleCY = parseFloat(tuple[tupleLen - 5]);
    var tupleWidth = parseFloat(tuple[tupleLen - 2]) - parseFloat(tuple[tupleLen - 4]);
    var tupleHeight = parseFloat(tuple[tupleLen - 1]) - parseFloat(tuple[tupleLen - 3]);
    var minx = Math.max(tupleCX - tupleWidth / 2, viewport[0]);
    var maxx = Math.min(tupleCX + tupleWidth / 2, viewport[0] + viewport[2]);
    var miny = Math.max(tupleCY - tupleHeight / 2, viewport[1]);
    var maxy = Math.min(tupleCY + tupleHeight / 2, viewport[1] + viewport[3]);

    //TODO: preloading boarder tiles should fix the problem when zooming boarder objects
//    console.log(tuple + " : " + minx + " " + miny + " " + maxx + " " + maxy);
    var zoomTransition = d3.select("#mainSvg").transition("zoom")
        .duration(2000)
        .tween("zoomTween", function(d) {
            var i = d3.interpolateZoom([viewport[2] / 2, viewport[3] / 2, viewport[2]],
                                       [minx + (maxx - minx) / 2 - viewport[0], miny + (maxy - miny) / 2 - viewport[1], tupleWidth / 4]);
            return function(t) {zoomInto(t, i(t));};
        })
        .on("end", function () {
            getCurCanvas();
            globalVar.jumpOptions.node().innerHTML = '';
            RefreshCanvas(newViewportX, newViewportY);
            d3.select("#mainSvg").style("opacity", 1);
        });

    function zoomInto(t, v) {

        var vWidth = v[2];
        var vHeight = globalVar.viewportHeight / globalVar.viewportWidth * vWidth;
        var minx = parseFloat(viewport[0]) + parseFloat(v[0]) - vWidth / 2;
        var miny = parseFloat(viewport[1]) + parseFloat(v[1]) - vHeight / 2;

        // change viewBox
        d3.select("#mainSvg").attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change opacity
        var threshold = 0.5;    //TODO: get rid of magic number
        if (t >= threshold)
            d3.select("#mainSvg").style("opacity", 1 - (t - threshold) / (1 - threshold));
    };
};
