// register jump info for a tile
function registerJumps(svg) {
    var jumps = globalVar.curJump;
    var gs = svg.selectAll("g");
    gs.each(function(d, i) {

        var layerId = globalVar.curCanvas.layers.length - i - 1;
        var shapes = d3.select(this).selectAll("*")
            .attr("data-layer-id", layerId);
        shapes.each(function(p, j){

            d3.select(this).on("click", function () {

                var layerId = d3.select(this).attr("data-layer-id");
                // check if there is any jump related
                var jumpCount = 0;
                for (var k = 0; k < jumps.length; k ++)
                    if (jumps[k].newViewports[layerId] !== "")
                        jumpCount ++;

                if (jumpCount == 0)
                    return ;

                globalVar.jumpOptions.html("<div>Jump to: </div>");
                for (var k = 0; k < jumps.length; k ++) {

                    // check if this jump is applied in this layer
                    if (jumps[k].type != "semantic_zoom" || jumps[k].newViewports[layerId] == "")
                        continue;

                    // create a button and append it to jumpOptions
                    var button = globalVar.jumpOptions.append("input")
                        .attr("type", "button")
                        .attr("value", jumps[k].destId)
                        .attr("data-tuple", d3.select(this).attr("data-tuple"))
                        .attr("data-jump-id", k)
                        .attr("data-layer-id", layerId)
                        .classed("jumpButton", true);

                    button.on("click", function () {

                        var tuple = d3.select(this).attr("data-tuple").split(",");
                        var jumpId = d3.select(this).attr("data-jump-id");
                        var layerId = d3.select(this).attr("data-layer-id");
                        globalVar.curCanvasId = jumps[jumpId].destId;

                        // calculate new predicates
                        var newPredicateFunc = jumps[jumpId].newPredicates[layerId].parseFunction();
                        globalVar.predicates = newPredicateFunc(tuple);

                        // calculate new viewport
                        var newViewportFunc = jumps[jumpId].newViewports[layerId].parseFunction();
                        var newViewportRet = newViewportFunc(tuple);
                        if (newViewportRet[0] == 0) {
                            // constant viewport, no predicate
                            var newViewportX = newViewportRet[1];
                            var newViewportY = newViewportRet[2];
                            completeJump(tuple, newViewportX, newViewportY);
                        }
                        else {
                            // viewport is fixed at a certain tuple
                            var postData = "canvasId=" + globalVar.curCanvasId;
                            for (var i = 0; i < newViewportRet[1].length; i++)
                                postData += "&predicate" + i + "=" + newViewportRet[1][i];
                            $.ajax({
                                type: "POST",
                                url: "viewport",
                                data: postData,
                                success: function (data, status) {
                                    var cx = JSON.parse(data).cx;
                                    var cy = JSON.parse(data).cy;
                                    var newViewportX = cx - globalVar.viewportWidth / 2;
                                    var newViewportY = cy - globalVar.viewportHeight / 2;
                                    completeJump(tuple, newViewportX, newViewportY);
                                },
                                async: false
                            });
                        }
                    });
                }
            });
        });
    });
};
