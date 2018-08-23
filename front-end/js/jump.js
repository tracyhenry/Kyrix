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

    // change .mainsvg to .oldmainsvg, and .layerg to .oldlayerg
    d3.selectAll(".mainsvg")
        .classed("mainsvg", false)
        .classed("oldmainsvg", true);
    d3.selectAll(".layerg")
        .classed("layerg", false)
        .classed("oldlayerg", true);

    // remove cursor pointers and onclick listeners
    d3.select("#containerSvg")
        .selectAll("*")
        .style("cursor", "auto");
    d3.selectAll("button")
        .attr("disabled", true);
    d3.selectAll("*")
        .on("click", null);
    globalVar.animation = true;
};

function postAnimation(zoomType) {

    function postOldLayerRemoval() {

        // set up zoom
        setupZoom(1);

        // set up button states
        setButtonState();

        // register jumps here because during animation
        // jumps are not allowed to be registered
        globalVar.animation = false;
        for (var i = 0; i < globalVar.curCanvas.layers.length; i ++) {
            var curLayer = globalVar.curCanvas.layers[i];
            if (! curLayer.isStatic && param.fetchingScheme == "tiling")
                d3.select(".layerg.layer" + i)
                    .select("svg")
                    .selectAll(".lowestsvg")
                    .each(function() {
                        registerJumps(d3.select(this), i);
                    });
            else
                registerJumps(d3.select(".layerg.layer" + i).select("svg"), i);
        }
    };

    if (zoomType == null)
        zoomType = param.semanticZoom;

    // set the viewBox & opacity of the new .mainsvgs
    // because d3 tween does not get t to 1.0
    d3.selectAll(".mainsvg:not(.static)")
        .attr("viewBox", globalVar.initialViewportX + " "
            + globalVar.initialViewportY + " "
            + globalVar.viewportWidth + " "
            + globalVar.viewportHeight)
        .style("opacity", 1);
    d3.select(".mainsvg.static").attr("viewBox", "0 0 "
        + globalVar.viewportWidth + " "
        + globalVar.viewportHeight)
        .style("opacity", 1);

    // display axes
    d3.select("#axesg").transition()
        .duration(param.axesInDuration)
        .style("opacity", 1);

    // use a d3 transition to remove things based on zoom type
    var removalDelay = 0;
    if (zoomType == param.geometricSemanticZoom)
        removalDelay = param.oldRemovalDelay;
    var numOldLayer = d3.selectAll(".oldlayerg").size();
    d3.selectAll(".oldlayerg")
        .transition()
        .delay(removalDelay)
        .remove()
        .on("end", postOldLayerRemoval);
    if (numOldLayer == 0)
        postOldLayerRemoval();
};

// animate semantic zoom
function animateSemanticZoom(tuple, newViewportX, newViewportY) {

    // disable stuff
    preAnimation();

    // whether this semantic zoom is also geometric
    var zoomType = globalVar.history[globalVar.history.length - 1].zoomType;
    var enteringAnimation = (zoomType == param.semanticZoom ? true : false);

    // calculate tuple boundary
    var curViewport = d3.select(".oldmainsvg:not(.static)").attr("viewBox").split(" ");
    for (var i = 0; i < curViewport.length; i ++)
        curViewport[i] = +curViewport[i];
    var tupleLen = tuple.length;
    var tupleCX = +tuple[tupleLen - param.cxOffset];
    var tupleCY = +tuple[tupleLen - param.cyOffset];
    var tupleWidth = tuple[tupleLen - param.maxxOffset] - tuple[tupleLen - param.minxOffset];
    var tupleHeight = tuple[tupleLen - param.maxyOffset] - tuple[tupleLen - param.minyOffset];
    var minx, maxx, miny, maxy;
    if (tupleWidth == 0 || tupleHeight == 0) {  // check when placement func is not specified
        minx = globalVar.curCanvas.w;
        miny = globalVar.curCanvas.h;
        maxx = maxy = 0;
        d3.select("#containerSvg")
            .selectAll("*")
            .filter(function (d){
                return d == tuple;
            })
            .each(function () {
                var bbox = this.getBBox();
                minx = Math.min(minx, bbox.x);
                miny = Math.min(miny, bbox.y);
                maxx = Math.max(maxx, bbox.x + bbox.width);
                maxy = Math.max(maxy, bbox.y + bbox.height);
            });
    }
    else {
        minx = tupleCX - tupleWidth / 2.0;
        maxx = tupleCX + tupleWidth / 2.0;
        miny = tupleCY - tupleHeight / 2.0;
        maxy = tupleCY + tupleHeight / 2.0;
    }

    // use tuple boundary to calculate start and end views, and log them to the last history object
    var startView = [curViewport[2] / 2.0, curViewport[3] / 2.0, curViewport[2]];
    var endView = [minx + (maxx - minx) / 2.0 - curViewport[0],
        miny + (maxy - miny) / 2.0 - curViewport[1],
        (maxx - minx) / (enteringAnimation ? param.zoomScaleFactor : 1)];
    globalVar.history[globalVar.history.length - 1].startView = startView;
    globalVar.history[globalVar.history.length - 1].endView = endView;

    // set up zoom transitions
    param.zoomDuration = d3.interpolateZoom(startView, endView).duration;
    param.enteringDelay = Math.round(param.zoomDuration * param.enteringDelta);
    d3.transition("zoomInTween")
        .duration(param.zoomDuration)
        .tween("zoomInTween", function() {

            var i = d3.interpolateZoom(startView, endView);
            return function(t) {zoomAndFade(t, i(t));};
        })
        .on("start", function () {

            // set initial global var initialViewportX/Y
            globalVar.initialViewportX = newViewportX;
            globalVar.initialViewportY = newViewportY;

            // schedule a new entering transition
            if (enteringAnimation)
                d3.transition("enterTween")
                    .delay(param.enteringDelay)
                    .duration(param.enteringDuration)
                    .tween("enterTween", function() {

                        return function(t) {enterAndScale(d3.easeCircleOut(t));};
                    })
                    .on("start", function() {

                        // get the canvas object for the destination canvas
                        getCurCanvas();

                        // static trim
                        renderStaticLayers();

                        // render
                        RefreshDynamicLayers(newViewportX, newViewportY);

                    })
                    .on("end", function () {

                        postAnimation(zoomType);
                    });
        })
        .on("end", function () {

            if (! enteringAnimation) {

                // get the canvas object for the destination canvas
                getCurCanvas();

                // static trim
                renderStaticLayers();

                // render
                RefreshDynamicLayers(newViewportX, newViewportY);

                // clean up
                postAnimation(zoomType);
            }
        });

    function zoomAndFade(t, v) {

        var vWidth = v[2];
        var vHeight = globalVar.viewportHeight / globalVar.viewportWidth * vWidth;
        var minx = curViewport[0] + v[0] - vWidth / 2.0;
        var miny = curViewport[1] + v[1] - vHeight / 2.0;

        // change viewBox of dynamic layers
        d3.selectAll(".oldmainsvg:not(.static)")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change viewBox of static layers
        minx = v[0] - vWidth / 2.0;
        miny = v[1] - vHeight / 2.0;
        d3.selectAll(".oldmainsvg.static")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change opacity
        if (enteringAnimation) {
            var threshold = param.fadeThreshold;
            if (t >= threshold) {
                d3.selectAll(".oldmainsvg")
                    .style("opacity", 1.0 - (t - threshold) / (1.0 - threshold));
            }
        }
    };

    function enterAndScale(t) {

        var vWidth = globalVar.viewportWidth * param.enteringScaleFactor
            / (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var vHeight = globalVar.viewportHeight * param.enteringScaleFactor
            / (1.0 + (param.enteringScaleFactor - 1.0) * t);
        var minx = newViewportX + globalVar.viewportWidth / 2.0 - vWidth / 2.0;
        var miny = newViewportY + globalVar.viewportHeight / 2.0 - vHeight / 2.0;

        // change viewBox of dynamic layers
        d3.selectAll(".mainsvg:not(.static)")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change viewbox of static layers
        minx = globalVar.viewportWidth / 2 - vWidth / 2;
        miny = globalVar.viewportHeight / 2 - vHeight / 2;
        d3.selectAll(".mainsvg.static")
            .attr("viewBox", minx + " " + miny + " " + vWidth + " " + vHeight);

        // change opacity
        d3.selectAll(".mainsvg").style("opacity", t);
    };
};

// register jump info for a tile
function registerJumps(svg, layerId) {

    var jumps = globalVar.curJump;
    var shapes = svg.select("g").selectAll("*");

    shapes.each(function(p) {

        // check if this shape has jumps
        var hasJump = false;
        for (var k = 0; k < jumps.length; k ++)
            if ((jumps[k].type == param.semanticZoom || jumps[k].type == param.geometricSemanticZoom)
                && jumps[k].selector.parseFunction()(p, layerId)) {
                hasJump = true;
                break;
            }
        if (! hasJump)
            return ;

        // make cursor a hand when hovering over this shape
        d3.select(this)
            .style("cursor", "zoom-in")
            .attr("data-layer-id", layerId);

        // register onclick listener
        d3.select(this).on("click", function () {

            // stop the click event from propagating up
            d3.event.stopPropagation();

            // get layer id from the data-layer-id attribute
            var layerId = d3.select(this).attr("data-layer-id");

            // data tuple associated with this shape
            var tuple = d3.select(this).datum();

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
                if ((jumps[k].type != param.semanticZoom && jumps[k].type != param.geometricSemanticZoom)
                    || ! jumps[k].selector.parseFunction()(tuple, layerId))
                    continue;

                // create table cell and append it to #popovercontent
                var jumpOption = d3.select("#popovercontent")
                    .append("a")
                    .classed("list-group-item", true)
                    .attr("href", "#")
                    .datum(tuple)
                    .attr("data-jump-id", k)
                    .html(jumps[k].name.parseFunction() == null ? jumps[k].name
                        : jumps[k].name.parseFunction()(tuple));

                // on click
                jumpOption.on("click", function () {

                    d3.event.preventDefault();

                    var tuple = d3.select(this).datum();
                    var jumpId = d3.select(this).attr("data-jump-id");

                    // log history
                    logHistory(jumps[jumpId].type);

                    // reset globalvar.boxx
                    globalVar.boxX = -1000;

                    // change canvas id
                    globalVar.curCanvasId = jumps[jumpId].destId;

                    // calculate new predicates
                    globalVar.predicates = jumps[jumpId].newPredicates.parseFunction()(tuple);

                    // prefetch canvas object by sending an async request to server
                    if (! (postData in globalVar.cachedCanvases)) {
                        var postData = "id=" + globalVar.curCanvasId;
                        for (var i = 0; i < globalVar.predicates.length; i ++)
                            postData += "&predicate" + i + "=" + globalVar.predicates[i];
                        $.ajax({
                            type : "POST",
                            url : "canvas",
                            data : postData,
                            success : function (data, status) {
                                if (! (postData in globalVar.cachedCanvases)) {
                                    globalVar.cachedCanvases[postData] = {};
                                    globalVar.cachedCanvases[postData].canvasObj = JSON.parse(data).canvas;
                                    globalVar.cachedCanvases[postData].jumps = JSON.parse(data).jump;
                                    globalVar.cachedCanvases[postData].staticData = JSON.parse(data).staticData;
                                }
                            },
                            async : true
                        });
                    }

                    // calculate new viewport
                    var newViewportFunc = jumps[jumpId].newViewports.parseFunction();
                    var newViewportRet = newViewportFunc(tuple);
                    if (newViewportRet[0] == 0) {
                        // constant viewport, no predicate
                        var newViewportX = newViewportRet[1];
                        var newViewportY = newViewportRet[2];
                        animateSemanticZoom(tuple, newViewportX, newViewportY);
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
                                animateSemanticZoom(tuple, newViewportX, newViewportY);
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
};
