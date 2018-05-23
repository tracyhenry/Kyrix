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

// disable and remove stuff before animation
function preAnimation() {

    // unbind zoom
    d3.select("#maing").on(".zoom", null);

    // use transition to remove axes, static trims & popovers
    d3.select("#axesg").transition()
        .duration(param.axesOutDuration)
        .style("opacity", 0);
    removePopoversSmooth();

    // remove cursor pointers and onclick listeners
    d3.select("#containerSvg")
        .selectAll("*")
        .style("cursor", "auto");
    d3.selectAll("button")
        .attr("disabled", true);
    d3.selectAll("*")
        .on("click", null);
};

function postAnimation() {

    // remove the old svgs
    d3.select("#oldMainSvg").remove();
    d3.select("#oldStaticg").remove();

    // set the viewBox & opacity of the new main svg and static svg
    // because d3 tween does not get t to 1.0
    d3.select("#mainSvg")
        .attr("viewBox", globalVar.initialViewportX + " "
        + globalVar.initialViewportY + " "
        + globalVar.viewportWidth + " "
        + globalVar.viewportHeight)
        .attr("opacity", 1);
    d3.select("#staticSvg").attr("viewBox", "0 0 "
        + globalVar.viewportWidth + " "
        + globalVar.viewportHeight)
        .attr("opacity", 1);

    // display axes
    d3.select("#axesg").transition()
        .duration(param.axesInDuration)
        .style("opacity", 1);

    // set up zoom
    setupZoom(1);

    // set up button states
    setButtonState();
};

// animate semantic zoom
function animateJump(tuple, newViewportX, newViewportY) {

    // disable stuff
    preAnimation();

    // change #mainSvg to #oldMainSvg, and #staticSvg to oldStaticSvg
    var oldMainSvg = d3.select("#mainSvg").attr("id", "oldMainSvg");
    var oldStaticSvg = d3.select("#staticSvg").attr("id", "oldStaticSvg");
    d3.select("#staticg").attr("id", "oldStaticg");

    // calculate tuple boundary
    var curViewport = oldMainSvg.attr("viewBox").split(" ");
    for (var i = 0; i < curViewport.length; i ++)
        curViewport[i] = +curViewport[i];
    var tupleLen = tuple.length;
    var tupleCX = +tuple[tupleLen - param.cxOffset];
    var tupleCY = +tuple[tupleLen - param.cyOffset];
    var tupleWidth = tuple[tupleLen - param.maxxOffset] - tuple[tupleLen - param.minxOffset];
    var tupleHeight = tuple[tupleLen - param.maxyOffset] - tuple[tupleLen - param.minyOffset];
    var minx = Math.max(tupleCX - tupleWidth / 2.0, curViewport[0]);
    var maxx = Math.min(tupleCX + tupleWidth / 2.0, curViewport[0] + curViewport[2]);
    var miny = Math.max(tupleCY - tupleHeight / 2.0, curViewport[1]);
    var maxy = Math.min(tupleCY + tupleHeight / 2.0, curViewport[1] + curViewport[3]);

    // use tuple boundary to calculate start and end views, and log them to the last history object
    var startView = [curViewport[2] / 2.0, curViewport[3] / 2.0, curViewport[2]];
    var endView = [minx + (maxx - minx) / 2.0 - curViewport[0],
        miny + (maxy - miny) / 2.0 - curViewport[1],
        tupleWidth / param.zoomScaleFactor];
    globalVar.history[globalVar.history.length - 1].startView = startView;
    globalVar.history[globalVar.history.length - 1].endView = endView;

    // set up zoom transitions
    param.zoomDuration = d3.interpolateZoom(startView, endView).duration;
    param.enteringDelay = Math.round(param.zoomDuration * param.enteringDelta);
    oldMainSvg.transition()
        .duration(param.zoomDuration)
        .tween("zoomInTween", function() {

            var i = d3.interpolateZoom(startView, endView);
            return function(t) {zoomAndFade(t, i(t));};
        })
        .on("start", function () {

            // create a new svg
            var newSvg = d3.select("#maing")
                .append("svg")
                .attr("id", "mainSvg")
                .attr("preserveAspectRatio", "none")
                .attr("width", globalVar.viewportWidth)
                .attr("height", globalVar.viewportHeight)
                .attr("x", 0)
                .attr("y", 0)
                .attr("viewBox", "0 0"
                    + " " + globalVar.viewportWidth * param.enteringScaleFactor
                    + " " + globalVar.viewportHeight * param.enteringScaleFactor);

            // schedule a new entering transition
            newSvg.transition()
                .delay(param.enteringDelay)
                .duration(param.enteringDuration)
                .tween("enterTween", function() {

                    return function(t) {enterAndScale(d3.easeCircleOut(t));};
                })
                .on("start", function() {

                    // set initial global var initialViewportX/Y
                    globalVar.initialViewportX = newViewportX;
                    globalVar.initialViewportY = newViewportY;

                    // get the canvas object for the destination canvas
                    getCurCanvas();

                    // render
                    RefreshCanvas(newViewportX, newViewportY);

                    // static trim
                    renderStaticTrim();
                })
                .on("end", function () {

                    postAnimation();
                });
        });

    function zoomAndFade(t, v) {

        var vWidth = v[2];
        var vHeight = globalVar.viewportHeight / globalVar.viewportWidth * vWidth;
        var minx = curViewport[0] + v[0] - vWidth / 2.0;
        var miny = curViewport[1] + v[1] - vHeight / 2.0;

        // change viewBox
        oldMainSvg.attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);
        minx = v[0] - vWidth / 2.0;
        miny = v[1] - vHeight / 2.0;
        oldStaticSvg.attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change opacity
        var threshold = param.fadeThreshold;
        if (t >= threshold) {
            oldMainSvg.style("opacity", 1.0 - (t - threshold) / (1.0 - threshold));
            oldStaticSvg.style("opacity", 1.0 - (t - threshold) / (1.0 - threshold));
        }
    };

    function enterAndScale(t) {

        var vWidth = globalVar.viewportWidth * param.enteringScaleFactor
            / (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var vHeight = globalVar.viewportHeight * param.enteringScaleFactor
            / (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var minx = newViewportX + globalVar.viewportWidth / 2.0 - vWidth / 2.0;
        var miny = newViewportY + globalVar.viewportHeight / 2.0 - vHeight / 2.0;

        // change mainsvg viewBox
        d3.select("#mainSvg")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change static svg viewbox
        minx = globalVar.viewportWidth / 2 - vWidth / 2;
        miny = globalVar.viewportHeight / 2 - vHeight / 2;
        d3.select("#staticSvg")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change opacity
        d3.select("#mainSvg").style("opacity", t);
        d3.select("#staticSvg").style("opacity", t);
    };
};

// register jump info for a tile
function registerJumps(svg) {

    var jumps = globalVar.curJump;
    var gs = svg.selectAll("g");
    gs.each(function(d, i) {

        var layerId = globalVar.curCanvas.layers.length - i - 1;
        var shapes = d3.select(this).selectAll("*")
            .attr("data-layer-id", layerId);
        shapes.each(function(p, j) {

            // check if this shape has jumps
            var hasJump = false;
            for (var k = 0; k < jumps.length; k ++)
                if (jumps[k].type == "semantic_zoom"
                    && jumps[k].newViewports[d3.select(this).attr("data-layer-id")] != "") {
                    hasJump = true;
                    break;
                }
            if (! hasJump)
                return ;

            // make cursor a hand when hovering over this shape
            d3.select(this)
                .style("cursor", "zoom-in");

            // register onclick listener
            d3.select(this).on("click", function () {

                // stop the click event from propagating up
                d3.event.stopPropagation();

                // log history
                logHistory("semantic_zoom");

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
                    .html("Zoom into ")
                    .append("a")
                    .classed("close", true)
                    .attr("href", "#")
                    .attr("id", "popoverclose")
                    .html("&times;");
                d3.select("#popoverclose")
                    .on("click", removePopovers);
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
                        .html(jumps[k].name.parseFunction() == null ? jumps[k].name
                            : jumps[k].name.parseFunction(d3.select(this).datum()));

                    // on click
                    jumpOption.on("click", function () {

                        d3.event.preventDefault();
                        var tuple = d3.select(this).datum();
                        var jumpId = d3.select(this).attr("data-jump-id");
                        var layerId = d3.select(this).attr("data-layer-id");
                        globalVar.curCanvasId = jumps[jumpId].destId;

                        // calculate new predicates
                        globalVar.predicates = jumps[jumpId].newPredicates[layerId].parseFunction()(tuple);

                        // calculate new static trim arguments
                        if (jumps[jumpId].newStaticTrimArguments == "")
                            globalVar.staticTrimArguments = [];
                        else
                            globalVar.staticTrimArguments = jumps[jumpId].newStaticTrimArguments.parseFunction()(tuple);

                        // calculate new viewport
                        var newViewportFunc = jumps[jumpId].newViewports[layerId].parseFunction();
                        var newViewportRet = newViewportFunc(tuple);
                        if (newViewportRet[0] == 0) {
                            // constant viewport, no predicate
                            var newViewportX = newViewportRet[1];
                            var newViewportY = newViewportRet[2];
                            animateJump(tuple, newViewportX, newViewportY);
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
                                    animateJump(tuple, newViewportX, newViewportY);
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
