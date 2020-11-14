function removePopovers(viewId) {
    var selector = ".popover";
    if (viewId != null) selector += ".view_" + viewId;
    selector += ",.kyrixtooltip";
    d3.selectAll(selector).remove();
}

function removePopoversSmooth(viewId) {
    var selector = ".popover";
    if (viewId != null) selector += ".view_" + viewId;
    selector += ",.kyrixtooltip";
    d3.selectAll(selector)
        .transition()
        .duration(param.popoverOutDuration)
        .style("opacity", 0)
        .remove();
}

// disable and remove stuff before jump
function preJump(viewId, jump) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    // execute jumpstart events
    if (gvd.onJumpstartHandlers != null) {
        var subEvts = Object.keys(gvd.onJumpstartHandlers);
        for (var subEvt of subEvts)
            if (typeof gvd.onJumpstartHandlers[subEvt] == "function")
                gvd.onJumpstartHandlers[subEvt](jump);
    }

    // unbind zoom
    d3.select(viewClass + ".maing").on(".zoom", null);

    // use transition to remove axes, static trims & popovers
    d3.select(viewClass + ".axesg")
        .transition()
        .duration(param.axesOutDuration)
        .style("opacity", 0);
    removePopoversSmooth(viewId);

    // change .mainsvg to .oldmainsvg, and .layerg to .oldlayerg
    d3.selectAll(viewClass + ".oldlayerg").remove();
    d3.selectAll(viewClass + ".layerg")
        .classed("layerg", false)
        .classed("oldlayerg", true);

    d3.selectAll(viewClass + ".mainsvg")
        .classed("mainsvg", false)
        .classed("oldmainsvg", true);

    // remove cursor pointers and onclick listeners
    d3.select(viewClass + ".viewsvg")
        .selectAll("*")
        .style("cursor", "auto")
        .on("click", null)
        .on(".kyrixtooltip", null);
    d3.selectAll("button" + viewClass).attr("disabled", true);

    gvd.animation = jump.type;
    gvd.initialScale = null;
}

function postJump(viewId, jump) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;
    var jumpType = jump.type;

    function postOldLayerRemoval() {
        // set up zoom
        if (jumpType == param.literalZoomOut)
            setupZoom(
                viewId,
                Math.max(
                    gvd.curCanvas.zoomInFactorX,
                    gvd.curCanvas.zoomInFactorY
                ) - param.eps
            );
        // hardcode for load for now
        // in the future we shouldn't need these if-elses
        // gvd.initialScale should be set prior to all jumps.
        // relevant: https://github.com/tracyhenry/Kyrix/issues/12
        else setupZoom(viewId, gvd.initialScale || 1);

        // set up button states
        setBackButtonState(viewId);

        // animation stopped now
        gvd.animation = false;

        // register jumps after every jump
        // reason: some coordination-based jumps maybe become applicable after a jump
        for (var i = 0; i < globalVar.project.views.length; i++) {
            var nViewId = globalVar.project.views[i].id;
            var nGvd = globalVar.views[nViewId];
            var nViewClass = ".view_" + nViewId;
            for (var j = 0; j < nGvd.curCanvas.layers.length; j++) {
                var curLayer = nGvd.curCanvas.layers[j];
                if (!curLayer.isStatic && curLayer.fetchingScheme == "tiling")
                    d3.select(nViewClass + ".layerg.layer" + j)
                        .select("svg")
                        .selectAll(".lowestsvg")
                        .each(function() {
                            registerJumps(nViewId, d3.select(this), j);
                        });
                else
                    registerJumps(
                        nViewId,
                        d3
                            .select(nViewClass + ".layerg.layer" + j)
                            .select("svg"),
                        j
                    );
            }
        }
    }

    // set the viewBox & opacity of the new .mainsvgs
    // because d3 tween does not get t to 1.0
    d3.selectAll(viewClass + ".mainsvg:not(.static)")
        .attr(
            "viewBox",
            gvd.initialViewportX +
                " " +
                gvd.initialViewportY +
                " " +
                gvd.viewportWidth +
                " " +
                gvd.viewportHeight
        )
        .style("opacity", 1);
    d3.selectAll(viewClass + ".mainsvg.static")
        .attr("viewBox", "0 0 " + gvd.viewportWidth + " " + gvd.viewportHeight)
        .style("opacity", 1);

    // display axes
    d3.select(viewClass + ".axesg")
        .transition()
        .duration(param.axesInDuration)
        .style("opacity", 1);

    // remove old layers if appropriate
    for (var i = 0; i < gvd.curCanvas.layers.length; i++)
        if (gvd.curCanvas.layers[i].isStatic)
            d3.selectAll(viewClass + ".oldlayerg" + ".layer" + i).remove();
    if (
        !(
            jumpType == param.geometricSemanticZoom ||
            jumpType == param.literalZoomIn ||
            jumpType == param.literalZoomOut ||
            jumpType == param.load
        )
    )
        d3.selectAll(viewClass + ".oldlayerg").remove();
    postOldLayerRemoval();

    // execute on jump handlers
    if (gvd.onJumpendHandlers != null) {
        var subEvts = Object.keys(gvd.onJumpendHandlers);
        for (var subEvt of subEvts)
            if (typeof gvd.onJumpendHandlers[subEvt] == "function")
                gvd.onJumpendHandlers[subEvt](jump);
    }
}

// animate semantic jumps (semantic_zoom, geometric_semantic_zoom, slide)
function semanticJump(viewId, jump, predArray, newVpX, newVpY, tuple) {
    var gvd = globalVar.views[viewId];

    // log history
    logHistory(viewId, jump);

    // change global vars
    gvd.curCanvasId = jump.destId;
    gvd.predicates = predArray;
    gvd.highlightPredicates = [];
    gvd.initialViewportX = newVpX;
    gvd.initialViewportY = newVpY;

    // prefetch canvas object by sending an async request to server
    var postData = "id=" + gvd.curCanvasId;
    for (var i = 0; i < gvd.predicates.length; i++)
        postData += "&predicate" + i + "=" + getSqlPredicate(gvd.predicates[i]);
    if (!(postData in globalVar.cachedCanvases)) {
        $.ajax({
            type: "GET",
            url: globalVar.serverAddr + "/canvas",
            data: postData,
            success: function(data, status) {
                if (!(postData in globalVar.cachedCanvases)) {
                    globalVar.cachedCanvases[postData] = {};
                    globalVar.cachedCanvases[postData].canvasObj = JSON.parse(
                        data
                    ).canvas;
                    globalVar.cachedCanvases[postData].jumps = JSON.parse(
                        data
                    ).jump;
                    globalVar.cachedCanvases[postData].staticData = JSON.parse(
                        data
                    ).staticData;
                }
            },
            async: true
        });
    }

    // disable stuff before animation
    preJump(viewId, jump);

    // animate semantic zoom
    if (
        jump.type == param.semanticZoom ||
        jump.type == param.geometricSemanticZoom
    )
        animateSemanticZoom(viewId, jump, newVpX, newVpY, tuple);
    else if (jump.type == param.slide)
        animateSlide(viewId, jump.slideDirection, newVpX, newVpY, 1, jump);
}

function load(predArray, newVpX, newVpY, newScale, viewId, canvasId, jump) {
    var destViewId = viewId;

    // stop any tweens
    d3.selection().interrupt("zoomInTween_" + destViewId);
    d3.selection().interrupt("enterTween_" + destViewId);
    d3.selection().interrupt("zoomOutTween_" + destViewId);
    d3.selection().interrupt("fadeTween_" + destViewId);
    d3.selection().interrupt("literalTween_" + destViewId);

    // reset global vars
    var gvd = globalVar.views[destViewId];
    gvd.curCanvasId = canvasId;
    gvd.predicates = predArray;
    gvd.highlightPredicates = [];
    gvd.initialViewportX = newVpX;
    gvd.initialViewportY = newVpY;
    gvd.initialScale = newScale;
    gvd.renderData = null;
    gvd.pendingBoxRequest = null;
    gvd.history = [];

    // pre animation
    preJump(destViewId, jump);

    // draw buttons because they were not created if it was an empty view
    drawZoomButtons(destViewId);

    // fetch static data from server, then render the view
    var gotCanvas = getCurCanvas(destViewId);
    gotCanvas.then(function() {
        // render static layers
        renderStaticLayers(destViewId);
        // post animation
        postJump(destViewId, jump);
    });
}

function highlight(predArray, jump) {
    var destViewId = jump.destViewId;
    var gvd = globalVar.views[destViewId];
    if (gvd.curCanvasId != jump.destId) return;
    gvd.highlightPredicates = predArray;
    for (var i = 0; i < gvd.curCanvas.layers.length; i++)
        d3.selectAll(".view_" + destViewId + ".layerg.layer" + i)
            .selectAll(".lowestsvg")
            .each(function() {
                highlightLowestSvg(destViewId, d3.select(this), i);
            });
}

// trigger jump on object [d], assuming this jump is applicable on d
function startJump(viewId, d, jump, optionalArgs) {
    removePopovers(viewId);

    // calculate new predicates
    var predDict = jump.predicates.parseFunction()(d, optionalArgs);
    var predArray = [];
    var numLayer = getCanvasById(jump.destId).layers.length;
    for (var i = 0; i < numLayer; i++)
        if ("layer" + i in predDict) predArray.push(predDict["layer" + i]);
        else predArray.push({});

    // calculate new viewport
    var newVpX, newVpY;
    if (jump.viewport.length > 0) {
        var viewportFunc = jump.viewport.parseFunction();
        var viewportFuncRet = viewportFunc(d, optionalArgs);

        if ("constant" in viewportFuncRet) {
            // constant viewport, no predicate
            newVpX = viewportFuncRet["constant"][0];
            newVpY = viewportFuncRet["constant"][1];
        } else if ("centroid" in viewportFuncRet) {
            //TODO: this is not tested
            // viewport is fixed at a certain tuple
            var postData = "canvasId=" + jump.destId;
            var predDict = viewportFuncRet["centroid"];
            for (var i = 0; i < numLayer; i++)
                if ("layer" + i in predDict)
                    postData +=
                        "&predicate" +
                        i +
                        "=" +
                        getSqlPredicate(predDict["layer" + i]);
                else postData += "&predicate" + i + "=";
            $.ajax({
                type: "GET",
                url: globalVar.serverAddr + "/viewport",
                data: postData,
                success: function(data, status) {
                    var cx = JSON.parse(data).cx;
                    var cy = JSON.parse(data).cy;
                    newVpX = cx - gvd.viewportWidth / 2;
                    newVpY = cy - gvd.viewportHeight / 2;
                },
                async: false
            });
        } else
            throw new Error("Unrecognized new viewport function return value.");
    }

    if (
        jump.type == param.semanticZoom ||
        jump.type == param.geometricSemanticZoom ||
        jump.type == param.slide
    )
        semanticJump(viewId, jump, predArray, newVpX, newVpY, d);
    else if (jump.type == param.load)
        load(predArray, newVpX, newVpY, 1, jump.destViewId, jump.destId, jump);
    else if (jump.type == param.highlight) highlight(predArray, jump);
}

// send updates to DB
function doDBUpdate(viewId, canvasId, layerId, tableName, newObjAttrs) {
  // find field in newObjAttrs that is the primary key identifier (like "id")
  let idColumn;
  const attributes = Object.keys(newObjAttrs);
  for (let idx = 0; idx < attributes.length; idx++) {
    const val = attributes[idx];
    if (val.includes("id")) {
      idColumn = val;
      break;
    }
  }

  const postData = {
    canvasId: canvasId,
    layerId: layerId,
    primaryKeyColumn: idColumn,
    objectAttributes: newObjAttrs,
  };
  $.ajax({
    type: "POST",
    url: globalVar.serverAddr + "/update",
    data: JSON.stringify(postData),
    success: function (data, status) {
      console.log(`update succeeded with data: ${JSON.stringify(data)}`);
    },
    async: false,
  });
}


// register jump info
function registerJumps(viewId, svg, layerId) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    var jumps = gvd.curJump;
    var shapes = svg.select("g:last-of-type").selectAll("*");
    var optionalArgs = getOptionalArgs(viewId);
    optionalArgs["layerId"] = layerId;

    shapes.each(function(p) {
        // check if this shape has jumps
        var hasJump = false;
        for (var k = 0; k < jumps.length; k++)
            if (
                (jumps[k].type == param.semanticZoom ||
                    jumps[k].type == param.geometricSemanticZoom ||
                    jumps[k].type == param.slide ||
                    (jumps[k].type == param.load &&
                        jumps[k].sourceViewId == viewId) ||
                    (jumps[k].type == param.highlight &&
                        jumps[k].sourceViewId == viewId &&
                        globalVar.views[jumps[k].destViewId].curCanvasId ==
                            jumps[k].destId)) &&
                jumps[k].selector.parseFunction()(p, optionalArgs)
            ) {
                hasJump = true;
                break;
            }
        if (!hasJump) return;

        // make cursor a hand when hovering over this shape
        d3.select(this).style("cursor", "zoom-in");

        // register onclick listener
        d3.select(this).on("click.popover", function(d) {
            // stop the click event from propagating up
            d3.event.stopPropagation();

            console.log(
              `selected object is T/F -> ${d3.select(this).classed("addObject")}`
            );
      
            if (d3.select(this).classed("addObject")) {
              // d3.selectAll(".view_" + viewId + ".layerg.layer" + )
              // .select(".svg")
      
              let newG = svg.append("g");

              let triangleG = newG.append("g");

              let triangle = triangleG
                .append("path")
                // .attr("x", width - bkgRectWidth - bkgRectXOffset)
                // .attr("y", 40)
                .attr("d", d3.symbol().size(5000).type(d3.symbolTriangle))
                .style("fill", "royalblue")
                .attr('party', 'dem');
              // .attr("transform", `translate(${gvd.curCanvas.w - 100},${300})`);
      
              let triangleText = triangleG
                .append("text")
                .attr("id", "triangle")
                .attr("dx", -20)
                .attr("dy", ".35em")
                // .attr("x", gvd.curCanvas.w)
                // .attr("y", 300)
                // .attr("transform", `translate(${gvd.curCanvas.w - 100 - 12},${300})`)
                .style('fill', 'white')
                .text("2000");

              

              let sliderVertical = d3
                  .sliderLeft()
                  .max(1000.00)
                  .min(10000.00)
                  .height(300)
                  .tickFormat(d3.format(',.0f'))
                  .ticks(10)
                  .default(5000.00)
                  .on("onchange", val => {
                    console.log("in onchange slider")
                    d3.select("#triangle").text(d3.format(',.0f')(val));
                  });
              
              let gVertical = newG
                .append("svg")
                .attr("width", 200)
                .attr("height", 400)
                // .append("text")
                // .attr("dx", 0)
                // .attr("dy", -100)
                // .text("Increase in Population")
                .append("g");

              gVertical
                .attr("transform", `translate(150,50)`);

              let updateLabel = newG
              .append("text")
              .attr("id", "slider-label")
              // .attr("dx", 0)
              // .attr("dy", -200)
              // .attr("x", gvd.curCanvas.w)
              // .attr("y", 300)
              // .attr("transform", `translate(${gvd.curCanvas.w - 100 - 12},${300})`)
              .text("Increase in Dem. Voters");
                

              gVertical.call(sliderVertical);
      
              newG.attr("transform", `translate(${gvd.curCanvas.w - 250},${200})`);
              triangleG.attr("transform", "translate(0,200)");

              // triangle dragging handler
              let dx = 0;
              let dy = 0;
              triangle.call(
                d3
                  .drag()
                  .on("start", function (d) {
                    console.log("starting drag");
                    dx = 0;
                    dy = 0;
                  })
                  .on("drag", function (d) {
                    dx += d3.event.dx;
                    dy += d3.event.dy;
                    triangle.attr("transform", "translate(" + dx + "," + dy + ")");
                    triangleText.attr("transform", "translate(" + dx + "," + dy + ")");

                    const triangle_bbox = triangle.node().getBoundingClientRect();
                    const tri_minx = triangle_bbox.left;
                    const tri_miny = triangle_bbox.top;
                    const tri_maxx = triangle_bbox.right;
                    const tri_maxy = triangle_bbox.bottom;
                    // const tri_cx = (tri_minx + tri_maxx) / 2.0  + 650;
                    // const tri_cy = (tri_miny + tri_maxy) / 2.0  + 250;
                    const tri_cx = (tri_minx + tri_maxx) / 2.0;
                    const tri_cy = (tri_miny + tri_maxy) / 2.0;
                    // let tri_startx = gvd.curCanvas.w - 250;
                    // let tri_starty = 400;
                    // let tri_cx = tri_startx + dx;
                    // let tri_cy = tri_starty + dy;
                    // let min_dist = 10000.0;
                    //   let min_obj;
                    d3.select(".mainsvg").select("g").selectAll("path")
                        .each((d,i) => {
                          let currentObject = d3.select(".mainsvg")
                              .select("g")
                              .selectAll("path")
                              .filter(function (data) {
                                return data == d;
                            });
                          const region_bbox = currentObject.node().getBoundingClientRect();
                          const minx = region_bbox.left;
                          const miny = region_bbox.top;
                          const maxx = region_bbox.right;
                          const maxy = region_bbox.bottom;
                          const cx = (minx + maxx) / 2.0;
                          const cy = (miny + maxy) / 2.0;
                          // const cx = parseFloat(d.cx);
                          // const cy = parseFloat(d.cy);
                          // const minx = parseFloat(d.minx);
                          // const miny = parseFloat(d.miny);
                          // const maxx = parseFloat(d.maxx);
                          // const maxy = parseFloat(d.maxy);
                          const width = maxx - minx;
                          const height = maxy - miny;
                          // console.log(`object ${i} has screen bbox: ${JSON.stringify(region_bbox)}`);
                          // console.log(`kyrix object ${i} has data: ${JSON.stringify(d)}`);
                          const r = Math.min(width,height) / 2.0;
                          // let overlapsX = tri_minx >= minx && maxx >= tri_maxx;
                          // let overlapsY = tri_miny >= miny && maxy >= tri_maxy;
                          // let tri_dist = Math.sqrt((tri_cx - cx)**2 + (tri_cy - cy)**2);
                          let tri_dist = Math.abs(tri_cx - cx) + Math.abs(tri_cy - cy);
                          if (tri_dist < r) {
                            console.log(`triangle is within ${tri_dist} of object ${i}`);
                            // min_dist = tri_dist;
                            // min_obj = d;
                            // do some stuff
                            d3.select(".mainsvg").select("g").selectAll("path")
                            .style("stroke", "white")
                            .style("stroke-width", "0.5");

                            
                            currentObject
                              .style("stroke", "green")
                              .style("stroke-width", "5.0");
                          }
                      });


                  })
                  .on("end", function (d) {
                    if (Math.abs(dx) > 50 || Math.abs(dy) > 50) {
                      // console.log("ended object drag");
                      // console.log(`triangle transform: ${d3.zoomTransform(triangle.node())}`);
                      d3.select(".mainsvg").select("g").selectAll("path")
                      .style("stroke", "white")
                      .style("stroke-width", "0.5");

                      //  TODO: create helper function for this repeat code!
                      d3.select(".mainsvg").select("g").selectAll("path")
                        .each((d,i) => {
                          let currentObject = d3.select(".mainsvg")
                              .select("g")
                              .selectAll("path")
                              .filter(function (data) {
                                return data == d;
                            });
                          const triangle_bbox = triangle.node().getBoundingClientRect();
                          const tri_minx = triangle_bbox.left;
                          const tri_miny = triangle_bbox.top;
                          const tri_maxx = triangle_bbox.right;
                          const tri_maxy = triangle_bbox.bottom;
                          const tri_cx = (tri_minx + tri_maxx) / 2.0;
                          const tri_cy = (tri_miny + tri_maxy) / 2.0;
                          const region_bbox = currentObject.node().getBoundingClientRect();
                          const minx = region_bbox.left;
                          const miny = region_bbox.top;
                          const maxx = region_bbox.right;
                          const maxy = region_bbox.bottom;
                          const cx = (minx + maxx) / 2.0;
                          const cy = (miny + maxy) / 2.0;
                          const width = maxx - minx;
                          const height = maxy - miny;
                          // console.log(`object ${i} has screen bbox: ${JSON.stringify(region_bbox)}`);
                          // console.log(`kyrix object ${i} has data: ${JSON.stringify(d)}`);
                          const r = Math.min(width,height) / 2.0;
                          // let overlapsX = tri_minx >= minx && maxx >= tri_maxx;
                          // let overlapsY = tri_miny >= miny && maxy >= tri_maxy;
                          // let tri_dist = Math.sqrt((tri_cx - cx)**2 + (tri_cy - cy)**2);
                          let tri_dist = Math.abs(tri_cx - cx) + Math.abs(tri_cy - cy);
                          if (tri_dist < r) {
                            console.log(`triangle is within ${tri_dist} of object ${i}`);
                            // let newData = d;
                            // newData.rate = parseFloat(d.rate) + 5.0;
                            // currentObject
                            //   .data()
                            // gvd - data for current view, current canvas, transform, etc.

                            // hard-coded layerid for now, fix this!
                            // let queryText = gvd.curCanvas.layers[1].transform.query;
                            // console.log(`query text for layerid: ${1} is: ${queryText}`);

                            // use regex to extract db column names from user-defined transform
                            // queryText = queryText.split("select")[1];
                            // let res = queryText.split("from");
                            // queryText = res[0];
                            // let tableName = res[1];
                            // tableName = tableName.replace(/[\s;]+/g, "").trim();
                            // queryText = queryText.replace(/\s+/g, "").trim();
                            // let queryFields = queryText.split(",");

                            let visFields = gvd.curCanvas.layers[1].transform.columnNames;

                            // find only directly mapped columns from object attributes
                            let directMappedColumns = {};
                            // const objectAttributes = Object.keys(p);
                            for (let idx in visFields) {
                              const field = visFields[idx];
                              // if (objectAttributes.includes(field)) {
                              directMappedColumns[field] = d[field];
                              // }
                            }

                            directMappedColumns["rate"] = parseFloat(d["rate"]) + 100.0;
                            // doDBUpdate(viewId, gvd.curCanvasId, 1, tableName, directMappedColumns);

                            d3.select(".mainsvg").select("g").selectAll("path")
                              .data(directMappedColumns)
                              .enter()
                              .append("path")
                              .attr("d", function(d) {
                                  var feature = JSON.parse(d.geomstr);
                                  return path(feature);
                              })
                              .style("stroke", "#fff")
                              .style("stroke-width", "0.5")
                              .style("fill", function(d) {
                                  return color(d.rate);
                              });
                            // d3.select(".mainsvg").select("g").selectAll("path")
                            // .style("stroke", "white")
                            // .style("stroke-width", "0.5");

                            
                            // currentObject
                            //   .style("stroke", "green")
                            //   .style("stroke-width", "5.0");
                            return;
                          }
                      });

                      
                      dx = 0;
                      dy = 0;
                      triangle.attr("transform", "translate(0,0)");
                      triangleText.attr("transform", "translate(0,0)");
                    }
                  })
              );

              triangle.on("click", () => {
                let party = triangle.attr('party');
                console.log(`triangle is currently party: ${party}`);
                if (party == "dem") {
                  triangle
                    .style('fill', 'red')
                    .attr('party', 'rep');
                  updateLabel
                    .text("Increase in Rep. Voters");
                } else {
                  triangle
                    .style('fill', 'royalblue')
                    .attr('party', 'dem');
                  updateLabel
                    .text("Increase in Dem. Voters");
                }
              });
              

                // svg.select("g").selectAll("path")
              //   // .data(data)
              //   // .enter()
              //   // .append("path")
              //   // .attr("d", function(d) {
              //   //     var feature = JSON.parse(d.geomstr);
              //   //     return path(feature);
              //   // })
              //   .style("stroke", "green")
              //   .style("stroke-width", "1.0");
              //   // .style("fill", function(d) {
              //   //     return color(d.rate);
              //   // });
              
              
              return;
            }

            // remove all popovers first
            removePopovers(viewId);

            // create a jumpoption popover using bootstrap
            d3.select("body")
                .append("div")
                .classed(
                    "view_" + viewId + " jumppopover popover fade right in",
                    true
                )
                .attr("role", "tooltip")
                .append("div")
                .classed("view_" + viewId + " popoverarrow arrow", true);
            d3.select(viewClass + ".jumppopover")
                .append("h2")
                .classed("view_" + viewId + " popover-title", true)
                .html("Jump Options")
                .append("a")
                .classed("view_" + viewId + " popoverclose close", true)
                .attr("href", "#")
                .html("&times;")
                .on("click", function() {
                    removePopovers(viewId);
                });
            d3.select(viewClass + ".jumppopover")
                .append("div")
                .classed(
                    "view_" +
                        viewId +
                        " popovercontent popover-content list-group",
                    true
                );

            // add jump options
            for (var k = 0; k < jumps.length; k++) {
                // check if this jump is applied in this layer
                if (
                    (jumps[k].type != param.semanticZoom &&
                        jumps[k].type != param.geometricSemanticZoom &&
                        jumps[k].type != param.slide &&
                        (jumps[k].type != param.load ||
                            jumps[k].sourceViewId != viewId) &&
                        (jumps[k].type != param.highlight ||
                            jumps[k].sourceViewId != viewId ||
                            globalVar.views[jumps[k].destViewId].curCanvasId !=
                                jumps[k].destId)) ||
                    !jumps[k].selector.parseFunction()(d, optionalArgs)
                )
                    continue;

                // create table cell and append it to .popovercontent
                var optionText = "<b>ZOOM IN </b>";
                if (jumps[k].type == param.load)
                    optionText =
                        "<b>LOAD " + jumps[k].destViewId + " VIEW with </b>";
                else if (jumps[k].type == param.highlight)
                    optionText =
                        "<b>HIGHLIGHT in " + jumps[k].destViewId + " VIEW </b>";
                if (jumps[k].noPrefix == true) {
                    optionText = "";
                }
                optionText +=
                    jumps[k].name.parseFunction() == null
                        ? jumps[k].name
                        : jumps[k].name.parseFunction()(d, optionalArgs);
                var jumpOption = d3
                    .select(viewClass + ".popovercontent")
                    .append("a")
                    .classed("list-group-item", true)
                    .attr("href", "#")
                    .datum(d)
                    .attr("data-jump-id", k)
                    .html(optionText);

                // on click
                jumpOption.on("click", function(d) {
                    d3.event.preventDefault();
                    var jump = jumps[d3.select(this).attr("data-jump-id")];
                    startJump(viewId, d, jump, optionalArgs);
                });
            }

            // position jump popover according to event x/y and its width/height
            var popoverHeight = d3
                .select(viewClass + ".jumppopover")
                .node()
                .getBoundingClientRect().height;
            d3.select(viewClass + ".jumppopover")
                .style("left", d3.event.pageX + "px")
                .style("top", d3.event.pageY - popoverHeight / 2 + "px");
        });
    });
}
