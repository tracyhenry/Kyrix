var jumpListener = function (tuple) {

    // stop the click event from propagating up
    if (d3.event != null)
        d3.event.stopPropagation();

    // all jumps
    var jumps = globalVar.views[0].curJump;

    // add jump options
    for (var k = 0; k < jumps.length; k ++) {

        // check if this jump is applied in this layer
        if (jumps[k].type != param.semanticZoom && jumps[k].type != param.geometricSemanticZoom)
            continue;

        var i = (jumps[k].destId == "spectrogram" ? 1 : 2);
        var globalVarDict = globalVar.views[i];

        // set canvasId
        globalVarDict.curCanvasId = jumps[k].destId;

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

    // hardcode: jump back to the top level of the cluster view
    if (param.labelingMode == "list") {
        if (globalVar.views[0].curCanvasId != "clusterlevel0") {
            globalVarDict = globalVar.views[0];
            globalVarDict.curCanvasId = "clusterlevel0";
            globalVarDict.initialViewportX = globalVarDict.initialViewportY = 0;
            globalVarDict.predicates = [""];
            var gotCanvas = getCurCanvas(0);
            gotCanvas.then(function () {
                // render static trims
                renderStaticLayers(0);

                // set up zoom
                setupZoom(0, 1);
            });
        }
        else
            RefreshDynamicLayers(0, 0, 0);
    }
};

// register jump info
function registerJumps(viewId, svg, layerId) {

    // hardcoding: no register jump for eeg or spectrogram
    if (viewId != 0)
        return ;

    // hardcoding: if labeling mode is list labeling, then no clicking-jump
    if (param.labelingMode == "list")
        return ;

    // all shapes
    var shapes = svg.select("g:last-of-type").selectAll("*");
    shapes.each(function() {

        // make cursor a hand when hovering over this shape
        d3.select(this)
            .style("cursor", "zoom-in");

        // register onclick listener
        d3.select(this).on("click", function (d) {jumpListener(d);});
    });
};
