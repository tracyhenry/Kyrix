// register jump info for a tile
function registerJumps(viewId, svg, layerId) {

    // hardcoding: no register jump for eeg or spectrogram
    if (viewId != 0)
        return ;

    // get a reference for current globalvar dict
    var globalVarDict = globalVar.views[viewId];

    // register jump stuff
    var jumps = globalVarDict.curJump;
    var shapes = svg.select("g:last-of-type").selectAll("*");

    var jumpListener = function () {

        // stop the click event from propagating up
        d3.event.stopPropagation();

        // data tuple associated with this shape
        var tuple = d3.select(this).datum();

        // add jump options
        for (var k = 0; k < jumps.length; k ++) {

            // check if this jump is applied in this layer
            if ((jumps[k].type != param.semanticZoom && jumps[k].type != param.geometricSemanticZoom)
                || ! jumps[k].selector.parseFunction()(tuple, layerId))
                continue;

            var i = (jumps[k].destId == "spectrogram" ? 1 : 2);
            var globalVarDict = globalVar.views[i];

            // set canvasId
            globalVarDict.curCanvasId = jumps[k].destId;

            // reset globalvar.boxx
//            globalVarDict.boxX = -1000;

            // calculate new predicates
            globalVarDict.predicates = jumps[k].newPredicates.parseFunction()(tuple);

            // calculate new viewport
            var newViewportFunc = jumps[k].newViewports.parseFunction();
            var newViewportRet = newViewportFunc(tuple);
            globalVarDict.initialViewportX = newViewportRet[1];
            globalVarDict.initialViewportY = newViewportRet[2];

            // get current canvas object
            var gotCanvas = getCurCanvas(i);
            gotCanvas.then((function (i) {
                return function () {
                    // render static trims
                    renderStaticLayers(i);

                    // set up zoom
                    setupZoom(i, 1);
                };
            })(i));
        }
    };

    shapes.each(function() {

        // make cursor a hand when hovering over this shape
        d3.select(this)
            .style("cursor", "zoom-in");

        // register onclick listener
        d3.select(this).on("click", jumpListener);
    });
};
