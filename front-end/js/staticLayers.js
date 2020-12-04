function renderStaticLayers(viewId) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // if no dynamic layers, render axes
    if (d3.select(viewClass + ".mainsvg:not(.static)").size() == 0)
        renderAxes(viewId, 0, 0, gvd.viewportWidth, gvd.viewportHeight);

    // number of layers
    var numLayers = gvd.curCanvas.layers.length;

    // loop over every layer
    for (var i = numLayers - 1; i >= 0; i--) {
        // current layer object
        var curLayer = gvd.curCanvas.layers[i];

        // if this layer is not static, return
        if (!curLayer.isStatic) continue;

        // render
        var renderFunc = curLayer.rendering.parseFunction();
        var curSvg = d3.select(viewClass + ".layerg.layer" + i).select("svg");
        var args = getOptionalArgs(viewId);
        args["layerId"] = i;
        args["ssvId"] = curLayer.ssvId;
        args["usmapId"] = curLayer.usmapId;
        args["staticAggregationId"] = curLayer.staticAggregationId;
        renderFunc(curSvg, gvd.curStaticData[i], args);

        // tooltips
        if (curLayer.tooltipColumns.length > 0)
            makeTooltips(
                curSvg.selectAll("*"),
                curLayer.tooltipColumns,
                curLayer.tooltipAliases
            );

        // register jump
        if (!gvd.animation) registerJumps(viewId, curSvg, i);

        // highlight
        highlightLowestSvg(viewId, curSvg, i);
    }
}
