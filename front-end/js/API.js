// initialize app, pass in server url (and possibly app name in the future)
// return a div that kyrix vis is contained in
export function initializeApp(serverAddr) {

    return pageOnLoad(serverAddr);
}

export function filterData(viewId, layerId, filterFunc) {

    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;
    d3.select(".kyrixdiv")
        .selectAll(viewClass + ".layerg.layer" + layerId)
        .selectAll(".lowestsvg")
        .selectAll("g")
        .selectAll("*")
        .attr("opacity", 1)
        .filter(filterFunc)
        .attr("opacity", 0);
}

export function getViews() {
    return globalVar.views;
}

export function triggerPan(viewId, panX, panY, delta) {
    var globalVarDict = globalVar.views[viewId];
    // number of layers
    var numLayers = globalVarDict.curCanvas.layers.length;

    // reset dynamic boxes
    globalVarDict.boxX = [-1e5];
    globalVarDict.boxY = [-1e5];
    globalVarDict.boxH = [-1e5];
    globalVarDict.boxW = [-1e5];

    // set render data
    globalVarDict.renderData = [];
    for (var i = numLayers - 1; i >= 0; i --)
        globalVarDict.renderData.push([]);

    d3.transition()
        .duration(1000)
        .tween("panTween", function () {
            var i = d3.interpolateNumber(1, panX);
            var j = d3.interpolateNumber(1, panY);
            var initialTransform = d3.zoomTransform(d3.select(".view_" + viewId).node());
            return function (t) {
                var deltaX = i(t) * delta;
                var deltaY = j(t) * delta;
                d3.select(".view_" + viewId).call(globalVarDict.zoom.transform,
                    initialTransform.translate(deltaX, deltaY));
            };
        });
}

export function getData() {
    return globalVar;
}

var keyboardHistory = "";
var datum;
export function highlightByInput(svg, key) {
    var count = 0;
    function toHighlight(d, pred) {
        if(d.name.toLowerCase().includes(pred)){
            count ++;
            datum = d;
            return true;
        }
        else
            return false;

    }
    if(key == "Backspace")
        keyboardHistory = keyboardHistory.slice(0, -1);
    else if(key == "Enter")
        triggerJump("usmap");
    else
        keyboardHistory += key;

    console.log(keyboardHistory);
    svg.selectAll("g")
        .selectAll("*")
        .each(function(d){
            if(d == null) return;
            if(toHighlight(d, keyboardHistory))
                d3.select(this).style("opacity", 1);
            else
                d3.select(this).style("opacity", 0.4);
        });
    if(count == 1)
        triggerJump("usmap");
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

export function refresh(viewId, callbackDynamic, callbackStatic, par){
    var viewClass = ".view_" + viewId;
    var gvd = globalVar.views[viewId];

 //   globalVar.newRender = callback;
 //   globalVar.newRenderPara = par;
    var numLayers = gvd.curCanvas.layers.length;
    var optionalArgs = getOptionalArgs(viewId);

    for (var i = numLayers - 1; i >= 0; i --) {
        var curLayer = gvd.curCanvas.layers[i];
        if (!curLayer.isStatic) {
            var dboxSvg = d3.select(viewClass + ".layerg.layer" + i)
                .select(".mainsvg");
            dboxSvg.selectAll("g")
                .filter(function () {
                    return d3.select(this).select("*").empty();
                })
                .remove();
            callbackDynamic(dboxSvg, gvd.renderData[i], optionalArgs, par);
            //register jump
        }
        else{
            var curSvg = d3.select(viewClass + ".layerg.layer" + i)
                .select("svg");
            curSvg.selectAll("*").remove();
            callbackStatic(curSvg, gvd.curStaticData[i], optionalArgs, par);
        }
    }
}

export function onPan(callback, viewId){
    globalVar.panCallback = callback;
    globalVar.panViewId = viewId;
}

export function getSvg(viewId){
    return d3.select(".view_" + viewId + ".layerg.layer1").select(".mainsvg");
}

export function zoomControl(zoom){
    globalVar.disableZoom = zoom;
}
