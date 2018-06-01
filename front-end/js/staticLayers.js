function renderStaticLayers() {

    // number of layers
    var numLayers = globalVar.curCanvas.layers.length;

    // loop over every layer
    for (var i = numLayers - 1; i >= 0; i--) {
        // current layer object
         var curLayer = globalVar.curCanvas.layers[i];

        // if this layer is not static, return
        if (! curLayer.isStatic)
            continue;

        // render
        var renderFunc = curLayer.rendering.parseFunction();
        var curSvg = d3.select(".layerg.layer" + i)
            .select("svg")
            .classed("lowestsvg", true);
        renderFunc(curSvg, globalVar.curStaticData[i]);

        // register jump
        registerJumps(curSvg, i);
    }
};
