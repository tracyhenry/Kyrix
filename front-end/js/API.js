
export function getViews(){
    return globalVar.views;
}

export function Pan(viewId, panX, panY, delta){
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

export function getData(){
    return globalVar;
}

var keyboardHistory = "";
var pred = "";
var datum;
export function highlightByInput(svg, key){
    function toHighlight(d, pred) {
        if(d.name.toLowerCase().includes(pred)){
            pred = d.name;
            datum = d;
            return true;
        }
        else
            return false;

    }
    if(key == "Backspace")
        keyboardHistory = keyboardHistory.slice(0, -1);
    if(key == "Enter")
        triggerJump("usmap");
    else
        keyboardHistory += key;
   // console.log(keyboardHistory);

    svg.selectAll("g")
        .selectAll("*")
        .each(function(d){
            if(d == null) return;
            if(toHighlight(d, keyboardHistory))
                d3.select(this).style("opacity", 1);
            else
                d3.select(this).style("opacity", 0.4);
        });

}

export function triggerJump(viewId){
    var gvd = globalVar.views[viewId];
    var jumps = gvd.curJump;
    var optionalArgs = getOptionalArgs(viewId);

    d3.event.preventDefault();
    var jump = jumps[0];
    removePopovers(viewId);
    console.log(datum);
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