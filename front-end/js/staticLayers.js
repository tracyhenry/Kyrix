function renderStaticLayers(viewId) {

    // get a reference for current globalvar dict
    var globalVarDict = globalVar.views[viewId];

    // number of layers
    var numLayers = globalVarDict.curCanvas.layers.length;

    // loop over every layer
    for (var i = numLayers - 1; i >= 0; i--) {
        // current layer object
         var curLayer = globalVarDict.curCanvas.layers[i];

        // if this layer is not static, return
        if (! curLayer.isStatic)
            continue;

        // render
        var renderFunc = curLayer.rendering.parseFunction();
        var curSvg = d3.select(".view" + viewId + ".layerg.layer" + i)
            .select("svg")
            .classed("lowestsvg", true);
        renderFunc(curSvg, globalVarDict.curStaticData[i],
            globalVarDict.viewportWidth,
            globalVarDict.viewportHeight);
    }
};
