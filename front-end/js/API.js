
export function getViews(){
    return globalVar.views;
}

export function Pan(viewId, panX, panY, delta){
    var globalVarDict = globalVar.views[viewId];

    d3.transition()
        .duration(1000)
        .tween("panTween", function () {
            var i = d3.interpolateNumber(1, panX);
            var j = d3.interpolateNumber(1, panY);
            var initialTransform = d3.zoomTransform(d3.select(".view_" + viewId).node());
            return function (t) {
                var deltaX = i(t) * delta;
                var deltaY = j(t);
                d3.select(".view_" + viewId).call(globalVarDict.zoom.transform,
                    initialTransform.translate(deltaX, deltaY));
            };
        });
}