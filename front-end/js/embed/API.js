// initialize app, pass in server url (and possibly app name in the future)
// return a div that kyrix vis is contained in
export function initializeApp(serverAddr) {

    return pageOnLoad(serverAddr);
}

export function filteredNodes(viewId, layerId, filterFunc) {

    var viewClass = ".view_" + viewId;
    return d3.select(".kyrixdiv")
        .selectAll(viewClass + ".layerg.layer" + layerId)
        .selectAll(".lowestsvg")
        .selectAll("g")
        .selectAll("*")
        .filter(filterFunc)
        .nodes();
}

export function setFilteredNodesOpacity(viewId, layerId, filterFunc, opacity) {

    var visibleNodes = filteredNodes(viewId, layerId, filterFunc);
    visibleNodes.forEach(function (node) {
        d3.select(node).attr("opacity", opacity);
    });
    return visibleNodes;
}

export function displayOnlyFilteredNodes(viewId, layerId, filterFunc) {

    var visibleNodes = setFilteredNodesOpacity(viewId, layerId, filterFunc, 1);
    setFilteredNodesOpacity(viewId, layerId, function(d) {
        return ! filterFunc(d);
    }, 0);
    return visibleNodes;
}

export function getCurrentCanvasId(viewId) {

    return globalVar.views[viewId].curCanvasId;
}

export function triggerPan(viewId, panX, panY) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;
    var curSelection = d3.select(viewClass + ".maing");

    // start a pan tween
    d3.transition()
        .duration(1000)
        .tween("webTriggeredPanTween", function () {

            var i = d3.interpolateNumber(0, panX);
            var j = d3.interpolateNumber(0, panY);
            var initialTransform = d3.zoomTransform(curSelection.node());
            return function (t) {

                var deltaX = i(t);
                var deltaY = j(t);
                curSelection.call(gvd.zoom.transform,
                    initialTransform.translate(deltaX, deltaY));
            };
        });
}

export function getRenderData(viewId) {

    var gvd = globalVar.views[viewId];
    var renderData = [];
    var numLayers = gvd.curCanvas.layers.length;
    for (var i = 0; i < numLayers; i ++)
        renderData.push(getRenderDataOfLayer(viewId, i));
    return renderData;
}

export function getRenderDataOfLayer(viewId, layerId) {

    var viewClass = ".view_" + viewId;
    var curlayerData = [];
    var mp = {}; // hashset
    d3.select(".kyrixdiv")
        .selectAll(viewClass + ".layerg.layer" + layerId)
        .selectAll(".lowestsvg")
        .selectAll("g")
        .selectAll("*")
        .each(function (d) {
            if (d == null || mp.hasOwnProperty(JSON.stringify(d)))
                return ;
            mp[JSON.stringify(d)] = true;
            curlayerData.push(d);
        });
    return curlayerData;
}

export function getViewSvg(viewId) {

    return d3.select(".view_" + viewId + ".viewsvg").node();
}

export function getMainSvg(viewId, layerId) {

    return d3.select(".view_" + viewId + ".layerg.layer" + layerId).select(".mainsvg").node();
}

export function getCurrentViewport(viewId) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;
    if (d3.select(viewClass + ".mainsvg:not(.static)").size() == 0)
        return {vpX : 0, vpY : 0, vpW : gvd.viewportWidth, vpH : gvd.viewportHeight};
    else {
        var viewBox = d3.select(viewClass + ".mainsvg:not(.static)").attr("viewBox").split(" ");
        return {vpX : viewBox[0], vpY : viewBox[1], vpW : viewBox[2], vpH : viewBox[3]};
    }
}

export function onPan(viewId, callback) {

    var gvd = globalVar.views[viewId];
    gvd.onPanHandler = callback;
}

export function reRender(viewId, layerId, additionalArgs) {

    var viewClass = ".view_" + viewId;
    var gvd = globalVar.views[viewId];
    var renderFunc = gvd.curCanvas.layers[layerId].rendering.parseFunction();

    // getting args dictionary
    var curVp = getCurrentViewport(viewId);
    var oldArgs = getOptionalArgs(viewId);
    oldArgs["viewportX"] = curVp["vpX"];
    oldArgs["viewportY"] = curVp["vpY"];
    var allArgs = Object.assign({}, oldArgs, additionalArgs);

    // re render the svg
    var renderData = getRenderDataOfLayer(viewId, layerId);
    d3.select(viewClass + ".layerg.layer" + layerId)
        .selectAll(".lowestsvg")
        .selectAll("*")
        .remove();
    d3.select(viewClass + ".layerg.layer" + layerId)
        .selectAll(".lowestsvg")
        .each(function () {

            // run render function
            renderFunc(d3.select(this), renderData, allArgs);

            // register jumps
            registerJumps(viewId, d3.select(this), layerId);

            // apply highlight
            highlightLowestSvg(viewId, d3.select(this), layerId);
        });
}

export function triggerJump(viewId, selector, layerId, jumpId) {

    var gvd = globalVar.views[viewId];
    var curDatum = d3.select(selector).datum();
    var jump = gvd.curJump[jumpId];

    // check applicability
    var optionalArgs = getOptionalArgs(viewId);
    optionalArgs["layerId"] = layerId;
    if (! jump.selector.parseFunction()(curDatum, optionalArgs))
        throw new Error("This jump is not applicable on this object.");

    // start jump
    startJump(viewId, curDatum, jump, optionalArgs);
}
