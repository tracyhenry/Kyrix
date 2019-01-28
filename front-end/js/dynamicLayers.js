// render axes
function renderAxes(viewId, viewportX, viewportY, vWidth, vHeight) {

    // get a reference for current globalvar dict
    var globalVarDict = globalVar.views[viewId];

    // get axes <g>
    var axesg = d3.select(".view" + viewId + ".axesg");
    axesg.selectAll("*").remove();

    // run axes function
    var axesFunc = globalVarDict.curCanvas.axes;
    if (axesFunc == "")
        return ;

    var axes = axesFunc.parseFunction()(globalVarDict.curCanvas.w,
        globalVarDict.curCanvas.h,
        globalVarDict.predicates);
    for (var i = 0; i < axes.length; i ++) {
        // create g element
        var curg = axesg.append("g")
            .classed("axis", true)
//            .attr("id", "axes" + i)
            .attr("transform", "translate("
                + axes[i].translate[0]
                + ","
                + axes[i].translate[1]
                + ")");

        // construct a scale function according to current viewport
        var newScale = axes[i].scale.copy();
        var newRange = [];
        if (axes[i].dim == "x") {
            newRange.push(viewportX), newRange.push(viewportX + vWidth);
            newScale.range([0, globalVarDict.viewportWidth]);
        }
        else {
            newRange.push(viewportY), newRange.push(viewportY + vHeight);
            newScale.range([0, globalVarDict.viewportHeight]);
        }
        newScale.domain(newRange.map(axes[i].scale.invert));

        // call axis function
        curg.call(axes[i].axis.scale(newScale));
        curg.selectAll(".tick line").attr("stroke", "#777").attr("stroke-dasharray", "3,10");
        curg.style("font", "25px arial")
    }
};

function RefreshDynamicLayers(viewId, viewportX, viewportY) {

    // no dynamic layers? return
    if (d3.select(".mainsvg:not(.static)").size() == 0)
        return ;

    // get a reference for current globalvar dict
    var globalVarDict = globalVar.views[viewId];

    // cast viewportX&Y to int
    viewportX = +viewportX;
    viewportY = +viewportY;

    // get current mainsvg
    var curMainSvgSelector = ".view" + viewId + ".mainsvg:not(.static)";

    // get current viewport
    var curViewport = d3.select(curMainSvgSelector)
        .attr("viewBox").split(" ");
    var vpW = +curViewport[2];
    var vpH = +curViewport[3];

    // render axes
    renderAxes(viewId, viewportX, viewportY, vpW, vpH);

    d3.selectAll(curMainSvgSelector)
        .attr("viewBox", viewportX + " " + viewportY + " " + vpW + " " + vpH);

    // check if there is pending box requests
    if (globalVarDict.pendingBoxRequest)
        return ;

    // check if there is literal zooming going on
    if (d3.event != null && d3.event.transform.k != 1)
        return ;

    // get new box
    // send request to backend to get data
    var postData = "id=" + globalVarDict.curCanvasId + "&"
        + "x=" + (viewportX | 0) + "&"
        + "y=" + (viewportY | 0);
    for (var i = 0; i < globalVarDict.predicates.length; i ++)
        postData += "&predicate" + i + "=" + globalVarDict.predicates[i];
    var cBoxX = globalVarDict.boxX[globalVarDict.boxX.length - 1], cBoxY = globalVarDict.boxY[globalVarDict.boxY.length - 1];
    var cBoxW = globalVarDict.boxW[globalVarDict.boxW.length - 1], cBoxH = globalVarDict.boxH[globalVarDict.boxH.length - 1];
    postData += "&oboxx=" + cBoxX + "&oboxy=" + cBoxY
        + "&oboxw=" + cBoxW + "&oboxh=" + cBoxH;
    postData += "&vpw=" + vpW + "&vph=" + vpH;

    if (cBoxX < -1e4 || (viewportX <= cBoxX + vpW / 3 && cBoxX >= 0)
        || (viewportX + vpW >= (cBoxX + cBoxW) - vpW / 3 && cBoxX + cBoxW <= globalVarDict.curCanvas.w)
        || (viewportY <= cBoxY + vpH / 3 && cBoxY >= 0)
        || (viewportY + vpH >= (cBoxY + cBoxH) - vpH / 3 && cBoxY + cBoxH <= globalVarDict.curCanvas.h)) {

        globalVarDict.pendingBoxRequest = true;
        $.ajax({
            type : "POST",
            url : "dbox",
            data : postData,
            cache : false,
            success : function (data) {

                // response data
                var response = JSON.parse(data);
                var renderData = response.renderData;
                var x = response.minx;
                var y = response.miny;
                var canvasId = response.canvasId;

                // check if this response is already outdated
                if (canvasId != globalVarDict.curCanvasId) {
                    globalVarDict.pendingBoxRequest = false;
                    return ;
                }

                // loop over every layer to render
                var numLayers = globalVarDict.curCanvas.layers.length;
                for (var i = numLayers - 1; i >= 0; i --) {

                    // current layer object
                    var curLayer = globalVarDict.curCanvas.layers[i];

                    // if this layer is static, return
                    if (curLayer.isStatic)
                        continue;

                    // current box svg
                    var dboxSvg = d3.select(".view" + viewId + ".maing")
                        .select(".layerg.layer" + i)
                        .select(".mainsvg");

                    // remove stale geometries
                    dboxSvg.selectAll("g")
                        .selectAll("*")
                        .filter(function(d) {
                            if (d[d.length - param.maxxOffset] < x ||
                                d[d.length - param.minxOffset] > (x + response.boxW) ||
                                d[d.length - param.maxyOffset] < y ||
                                d[d.length - param.minyOffset] > (y + response.boxH))
                                return true;
                            else
                                return false;
                        })
                        .remove();

                    // remove empty <g>s.
                    dboxSvg.selectAll("g")
                        .filter(function() {
                            return d3.select(this).select("*").empty();
                        })
                        .remove();

                    // construct new globalVarDict.renderData
                    // 1) add data from intersection
                    // 2) add data from response.renderData
                    var newLayerData = [];
                    for (var j = 0; j < globalVarDict.renderData[i].length; j ++) {
                        var d = globalVarDict.renderData[i][j];
                        if (! (d[d.length - param.maxxOffset] < x ||
                                d[d.length - param.minxOffset] > (x + response.boxW) ||
                                d[d.length - param.maxyOffset] < y ||
                                d[d.length - param.minyOffset] > (y + response.boxH)))
                            newLayerData.push(d);
                    }
                    for (var j = 0; j < renderData[i].length; j ++)
                        newLayerData.push(renderData[i][j]);
                    globalVarDict.renderData[i] = newLayerData;

                    // draw current layer - hardcoding : adding scale for eeg
                    curLayer.rendering.parseFunction()(dboxSvg, renderData[i],
                        globalVarDict.curCanvas.w,
                        globalVarDict.curCanvas.h,
                        globalVarDict.renderingParams,
                        globalVarDict.eegMagnitude,
                        globalVarDict.montage);

                    // hardcoding: mark median segment
                    if (viewId == 2)
                        markMedianSegment();

                    // register jumps
                    registerJumps(viewId, dboxSvg, +i);
                }

                // modify global var
                globalVarDict.boxH.push(response.boxH);
                globalVarDict.boxW.push(response.boxW);
                globalVarDict.boxX.push(x);
                globalVarDict.boxY.push(y);
                globalVarDict.pendingBoxRequest = false;

                // refresh dynamic layers again (#37)
                var curViewport = d3.select(".view" + viewId + ".mainsvg:not(.static)")
                    .attr("viewBox").split(" ");
                RefreshDynamicLayers(viewId, curViewport[0], curViewport[1]);
            },
            async : true
        });
    }
};
