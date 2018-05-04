function removePopovers() {

    d3.selectAll(".popover").remove();
};

function removePopoversSmooth() {

    d3.selectAll(".popover")
        .transition()
        .duration(param.popoverOutDuration)
        .style("opacity", 0)
        .remove();
};

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

                // remove all popovers first
                removePopovers();

                // create a jumpoption popover using bootstrap
                d3.select("body").append("div")
                    .classed("popover", true)
                    .classed("fade", true)
                    .classed("right", true)
                    .classed("in", true)
                    .attr("role", "tooltip")
                    .attr("id", "jumppopover")
                    .append("div")
                    .classed("arrow", true)
                    .attr("id", "popoverarrow");
                d3.select("#jumppopover")
                    .append("h2")
                    .classed("popover-title", true)
                    .attr("id", "popovertitle")
                    .html("Jump to ")
                    .append("a")
                    .classed("close", true)
                    .attr("href", "#")
                    .attr("id", "popoverclose")
                    .html("&times;");
                d3.select("#popoverclose")
                    .on("click", removePopoversSmooth);
                d3.select("#jumppopover")
                    .append("div")
                    .classed("popover-content", true)
                    .classed("list-group", true)
                    .attr("id", "popovercontent");

                // add jump options
                for (var k = 0; k < jumps.length; k ++) {

                    // check if this jump is applied in this layer
                    if (jumps[k].type != "semantic_zoom" || jumps[k].newViewports[layerId] == "")
                        continue;

                    // create table cell and append it to #popovercontent
                    var jumpOption = d3.select("#popovercontent")
                        .append("a")
                        .classed("list-group-item", true)
                        .attr("href", "#")
                        .datum(d3.select(this).datum())
                        .attr("data-jump-id", k)
                        .attr("data-layer-id", layerId)
                        .html(jumps[k].destId);

                    jumpOption.on("click", function () {

                        d3.event.preventDefault();
                        var tuple = d3.select(this).datum();
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

                // position jump popover according to event x/y and its width/height
                var popoverHeight = d3.select("#jumppopover")
                    .node()
                    .getBoundingClientRect()
                    .height;
                d3.select("#jumppopover")
                    .style("left", d3.event.pageX)
                    .style("top", (d3.event.pageY - popoverHeight / 2));
            });
        });
    });
};
