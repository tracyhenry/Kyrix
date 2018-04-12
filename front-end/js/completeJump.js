// complete the jump
// 1. get current canvas object
// 2. clear jump option div
// 3. call RefreshCanvas()
function completeJump(tuple, newViewportX, newViewportY) {

    // TODO : change all set/get attribute to d3 attr
    var viewport = d3.select("#mainSvg").attr("viewBox").split(" ");
    var tupleLen = tuple.length;
    var tupleCX = tuple[tupleLen - 6]; // TODO: get rid of magic number
    var tupleCY = tuple[tupleLen - 5];
    var tupleWidth = tuple[tupleLen - 2] - tuple[tupleLen - 4];

    console.log(viewport);
    console.log(tuple);
    console.log(tupleLen + " " + tupleCX + " " + tupleCY + " " + tupleWidth);
    d3.transition()
        .duration(750)
        .tween("zoom", function() {
            var i = d3.interpolateZoom([viewport[2] / 2, viewport[3] / 2, viewport[2]],
                                       [tupleCX - viewport[0], tupleCY - viewport[1], tupleWidth]);
            return function(t) { changeViewBox(i(t)); };
        })
        .on("end", function () {
            getCurCanvas();
            globalVar.jumpOptions.node().innerHTML = '';
            RefreshCanvas(newViewportX, newViewportY);
        });

    function changeViewBox(v) {

        var vWidth = v[2];
        var vHeight = globalVar.viewportHeight / globalVar.viewportWidth * vWidth;
        var minx = parseFloat(viewport[0]) + parseFloat(v[0]) - vWidth / 2;
        var miny = parseFloat(viewport[1]) + parseFloat(v[1]) - vHeight / 2;

        d3.select("#mainSvg").attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);
    };

};
