// register jump info for a tile
function registerJumps(svg) {
    var jumps = globalVar.curJump;
    var gs = svg.selectAll("g").nodes();
    for (var i = 0; i < gs.length; i ++) {
        var layerId = gs.length - i - 1;
        var shapes = gs[i].childNodes;
        for (var j = 0; j < shapes.length; j ++) {

            shapes[j].setAttribute("data-layer-id", layerId);
            shapes[j].onclick = function () {

                var layerId = this.getAttribute("data-layer-id");

                // check if there is any jump related
                var jumpCount = 0;
                for (var k = 0; k < jumps.length; k ++)
                    if (jumps[k].newViewports[layerId] !== "")
                        jumpCount ++;

                if (jumpCount == 0)
                    return ;

                globalVar.jumpOptions.node().innerHTML = "<div>Jump to: </div>";
                for (var k = 0; k < jumps.length; k ++) {

                    // check if this jump is applied in this layer
                    if (jumps[k].newViewports[layerId] == "")
                        continue;

                    // create a button and append it to jumpOptions
                    var button = document.createElement("input");
                    button.type = "button";
                    button.value = jumps[k].destId;
                    button.setAttribute("data-tuple", this.getAttribute("data-tuple"));
                    button.setAttribute("data-jump-id", k);
                    button.setAttribute("data-layer-id", layerId);
                    button.style.webkitAppearance = "none";
                    button.style.margin = "10px";
                    button.style.height = "30px";
                    button.style.width = "100px";
                    button.style.fontSize = "20px";
                    button.onclick = function () {

                        var tuple = this.getAttribute("data-tuple");
                        var jumpId = this.getAttribute("data-jump-id");
                        var layerId = this.getAttribute("data-layer-id");
                        globalVar.curCanvasId = jumps[jumpId].destId;

                        // calculate new predicates
                        var newPredicateFunc = jumps[jumpId].newPredicates[layerId].parseFunction();
                        globalVar.predicates = newPredicateFunc(tuple.split(","));

                        // calculate new viewport
                        var newViewportFunc = jumps[jumpId].newViewports[layerId].parseFunction();
                        var newViewportRet = newViewportFunc(tuple.split(","));
                        if (newViewportRet[0] == 0) {
                            // constant viewport, no predicate
                            var newViewportX = newViewportRet[1];
                            var newViewportY = newViewportRet[2];
                            getCurCanvas();
                            RefreshCanvas(newViewportX, newViewportY);
                        }
                        else {
                            // viewport is fixed at a certain tuple
                            var postData = "canvasId=" + globalVar.curCanvasId;
                            for (var i = 0; i < newViewportRet[1].length; i++) {
                                postData += "&predicate" + i + "=" + newViewportRet[1][i];
                            }
                            $.ajax({
                                type: "POST",
                                url: "viewport",
                                data: postData,
                                success: function (data, status) {
                                    var cx = JSON.parse(data).cx;
                                    var cy = JSON.parse(data).cy;
                                    var newViewportX = cx - globalVar.viewportWidth / 2;
                                    var newViewportY = cy - globalVar.viewportHeight / 2;
                                    getCurCanvas();
                                    globalVar.jumpOptions.node().innerHTML = '';
                                    RefreshCanvas(newViewportX, newViewportY);
                                },
                                async: false
                            });
                        }
                    };
                    globalVar.jumpOptions.node().appendChild(button);
                }
            }
        }
    }
}
