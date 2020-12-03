// initialize app, pass in server url and a div for holding kyrix vis
// return a promise that resolves when kyrix loads
export function initializeApp(serverAddr, kyrixDiv) {
    return pageOnLoad(serverAddr, kyrixDiv);
}

export function filteredNodes(viewId, layerId, filterFunc) {
    var viewClass = ".view_" + viewId;
    return d3
        .select(".kyrixdiv")
        .selectAll(viewClass + ".layerg.layer" + layerId)
        .selectAll(".lowestsvg")
        .selectAll("g")
        .selectAll("*")
        .filter(filterFunc)
        .nodes();
}

export function setFilteredNodesOpacity(viewId, layerId, filterFunc, opacity) {
    var visibleNodes = filteredNodes(viewId, layerId, filterFunc);
    visibleNodes.forEach(function(node) {
        d3.select(node).attr("opacity", opacity);
    });
    return visibleNodes;
}

export function displayOnlyFilteredNodes(viewId, layerId, filterFunc) {
    var visibleNodes = setFilteredNodesOpacity(viewId, layerId, filterFunc, 1);
    setFilteredNodesOpacity(
        viewId,
        layerId,
        function(d) {
            return !filterFunc(d);
        },
        0
    );
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
        .tween("webTriggeredPanTween", function() {
            var i = d3.interpolateNumber(0, panX);
            var j = d3.interpolateNumber(0, panY);
            var initialTransform = d3.zoomTransform(curSelection.node());
            return function(t) {
                var deltaX = i(t);
                var deltaY = j(t);
                curSelection.call(
                    gvd.zoom.transform,
                    initialTransform.translate(deltaX, deltaY)
                );
            };
        });
}

export function getRenderData(viewId) {
    var gvd = globalVar.views[viewId];
    var ret = [];
    for (var i = 0; i < gvd.renderData.length; i++) {
        if (gvd.curCanvas.layers[i].isStatic) ret.push(gvd.curStaticData[i]);
        else ret.push(gvd.renderData[i]);
    }
    return ret;
}

export function getRenderDataOfLayer(viewId, layerId) {
    var gvd = globalVar.views[viewId];
    if (gvd.curCanvas.layers[layerId].isStatic)
        return gvd.curStaticData[layerId];
    else return gvd.renderData[layerId];
}

export function getObjectData(viewId) {
    var gvd = globalVar.views[viewId];
    var renderData = [];
    var numLayers = gvd.curCanvas.layers.length;
    for (var i = 0; i < numLayers; i++)
        renderData.push(getObjectDataOfLayer(viewId, i));
    return renderData;
}

export function getObjectDataOfLayer(viewId, layerId) {
    var viewClass = ".view_" + viewId;
    var curlayerData = [];
    var mp = {}; // hashset
    d3.select(".kyrixdiv")
        .selectAll(viewClass + ".layerg.layer" + layerId)
        .selectAll(".lowestsvg")
        .selectAll("g")
        .selectAll("*")
        .each(function(d) {
            if (d == null || mp.hasOwnProperty(JSON.stringify(d))) return;
            mp[JSON.stringify(d)] = true;
            curlayerData.push(d);
        });
    return curlayerData;
}

export function getViewSvg(viewId) {
    return d3.select(".view_" + viewId + ".viewsvg").node();
}

export function getMainSvg(viewId, layerId) {
    return d3
        .select(".view_" + viewId + ".layerg.layer" + layerId)
        .select(".mainsvg")
        .node();
}

export function getCurrentViewport(viewId) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;
    if (d3.select(viewClass + ".mainsvg:not(.static)").size() == 0)
        return {
            vpX: 0,
            vpY: 0,
            vpW: gvd.viewportWidth,
            vpH: gvd.viewportHeight
        };
    else {
        var viewBox = d3
            .select(viewClass + ".mainsvg:not(.static)")
            .attr("viewBox")
            .split(" ");
        return {
            vpX: viewBox[0],
            vpY: viewBox[1],
            vpW: viewBox[2],
            vpH: viewBox[3]
        };
    }
}

export function on(evt, viewId, callback) {
    function throwError() {
        throw new Error("kyrix.on: unrecognized Kyrix event type.");
    }
    var gvd = globalVar.views[viewId];
    var evtTypes = ["pan", "zoom", "jumpstart", "jumpend"];
    for (var evtType of evtTypes)
        if (evt.startsWith(evtType)) {
            if (evt.length > evtType.length && evt[evtType.length] != ".")
                throwError();
            var gvdKey =
                "on" +
                evtType[0].toUpperCase() +
                evtType.substring(1) +
                "Handlers";
            if (!gvd[gvdKey]) gvd[gvdKey] = {};
            var subEvt = "";
            if (evt.length > evtType.length)
                subEvt = evt.substring(evtType.length + 1);
            if (typeof callback == "undefined") return gvd[gvdKey][subEvt];
            gvd[gvdKey][subEvt] = callback;

            return;
        }
    throwError();
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
    oldArgs["layerId"] = layerId;
    oldArgs["ssvId"] = gvd.curCanvas.layers[layerId].ssvId;
    oldArgs["usmapId"] = gvd.curCanvas.layers[layerId].usmapId;
    oldArgs["staticAggregationId"] =
        gvd.curCanvas.layers[layerId].staticAggregationId;
    var allArgs = Object.assign({}, oldArgs, additionalArgs);

    // re render the svg
    var renderData = getRenderDataOfLayer(viewId, layerId);
    d3.select(viewClass + ".layerg.layer" + layerId)
        .selectAll(".lowestsvg")
        .selectAll("*")
        .remove();
    d3.select(viewClass + ".layerg.layer" + layerId)
        .selectAll(".lowestsvg")
        .each(function() {
            // run render function
            renderFunc(d3.select(this), renderData, allArgs);

            // tooltips
            makeTooltips(
                d3.select(this).selectAll("*"),
                gvd.curCanvas.layers[layerId].tooltipColumns,
                gvd.curCanvas.layers[layerId].tooltipAliases
            );

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
    if (!jump.selector.parseFunction()(curDatum, optionalArgs))
        throw new Error("This jump is not applicable on this object.");

    // start jump
    startJump(viewId, curDatum, jump, optionalArgs);
}

export function addRenderingParameters(params) {
    var keys = Object.keys(params);
    for (var i = 0; i < keys.length; i++)
        globalVar.renderingParams[keys[i]] = params[keys[i]];
}

export function getRenderingParameters() {
    return globalVar.renderingParams;
}

export function getGlobalVarDictionary(viewId) {
    return globalVar.views[viewId];
}

export function triggerPredicate(viewId, predDict) {
    var gvd = globalVar.views[viewId];

    var vp = getCurrentViewport(viewId);

    // step 1: get predicates, viewport, scale
    var predArray = [];
    var numLayer = gvd.curCanvas.layers.length;
    for (var i = 0; i < numLayer; i++)
        if ("layer" + i in predDict) predArray.push(predDict["layer" + i]);
        else predArray.push({});

    var newVpX = vp.vpX;
    var newVpY = vp.vpY;
    var viewClass = ".view_" + viewId + ".maing";
    var k = d3.zoomTransform(d3.select(viewClass).node()).k;

    // step 2: load
    load(predArray, newVpX, newVpY, k, viewId, gvd.curCanvasId, {type: "load"});
}
