// initialize app, pass in server url (and possibly app name in the future)
// return a div that kyrix vis is contained in
export function initializeApp(serverAddr) {

    return pageOnLoad(serverAddr);
}

export function filterData(viewId, layerId, filterFunc, forEachFunc) {

    var viewClass = ".view_" + viewId;
    d3.select(".kyrixdiv")
        .selectAll(viewClass + ".layerg.layer" + layerId)
        .selectAll(".lowestsvg")
        .selectAll("g")
        .selectAll("*")
        .attr("opacity", 1)
        .filter(filterFunc)
        .each(function (d) {
            if (forEachFunc != null)
                forEachFunc(this, d);
            else
                d3.select(this).attr("opacity", 0);
        });
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

    var gvd = globalVar.views[viewId];
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
    d3.select(viewClass + ".layerg.layer" + i)
        .selectAll(".lowestsvg")
        .selectAll("*")
        .remove();
    var renderData = getRenderDataOfLayer(viewId, layerId);
    d3.select(viewClass + ".layerg.layer" + i)
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

export function triggerJump(viewId) {
    var gvd = globalVar.views[viewId];
    var jumps = gvd.curJump;
    var optionalArgs = getOptionalArgs(viewId);

    console.log(globalVar.disableZoom);
    if(globalVar.disableZoom)
        return;

    d3.event.preventDefault();
    var jump = jumps[0];
    removePopovers(viewId);

    // calculate new predicates
    var predDict = jump.predicates.parseFunction()(datum, optionalArgs);
    var predArray = [];
    var numLayer = getCanvasById(jump.destId).layers.length;
    for (var i = 0; i < numLayer; i ++)
        if (("layer" + i) in predDict)
            predArray.push(predDict["layer" + i]);
        else
            predArray.push({});

    // calculate new viewport
    var newVpX, newVpY;
    if (jump.viewport.length > 0) {
        var viewportFunc = jump.viewport.parseFunction();
        var viewportFuncRet = viewportFunc(datum, optionalArgs);

        if ("constant" in viewportFuncRet) {
            // constant viewport, no predicate
            newVpX = viewportFuncRet["constant"][0];
            newVpY = viewportFuncRet["constant"][1];
        }
        else if ("centroid" in viewportFuncRet) { //TODO: this is not tested
            // viewport is fixed at a certain tuple
            var postData = "canvasId=" + jump.destId;
            var predDict = viewportFuncRet["centroid"];
            for (var i = 0; i < numLayer; i ++)
                if (("layer" + i) in predDict)
                    postData += "&predicate" + i + "=" + getSqlPredicate(predDict["layer" + i]);
                else
                    postData += "&predicate" + i + "=";
            $.ajax({
                type: "POST",
                url: "viewport",
                data: postData,
                success: function (data, status) {
                    var cx = JSON.parse(data).cx;
                    var cy = JSON.parse(data).cy;
                    newVpX = cx - gvd.viewportWidth / 2;
                    newVpY = cy - gvd.viewportHeight / 2;
                },
                async: false
            });
        }
        else
            throw new Error("Unrecognized new viewport function return value.");
    }
    semanticZoom(viewId, jump, predArray, newVpX, newVpY, datum);
}