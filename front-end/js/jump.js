const { reverse } = require("dns");

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
function doDBUpdate(viewId, canvasId, layerId, tableName, newObjAttrs, projName) {
  // find field in newObjAttrs that is the primary key identifier (like "id")
  let idColumns = []; 
  const attributes = Object.keys(newObjAttrs);
  for (let idx = 0; idx < attributes.length; idx++) {
    const val = attributes[idx];
    if (val.includes("id")) {
      idColumns.push(val);
    }
  }

  const postData = {
    canvasId: canvasId,
    layerId: layerId,
    keyColumns: idColumns,
    objectAttributes: newObjAttrs,
    baseTable: tableName,
    projectName: projName,
  };
  
  console.log(`sending HTTP request to /update with data: ${JSON.stringify(postData)}`);
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

function createUpdatePopover(gvd, viewId, layerId, p) {
  console.log(gvd);

  // stop the right click event from propagating up
  d3.event.preventDefault();
  d3.event.stopPropagation();
  
  // gvd - data for current view, current canvas, transform, etc.
  let canvasId = gvd.curCanvasId;
  const viewClass = ".view_" + viewId;
  let queryText = gvd.curCanvas.layers[layerId].transform.query;
  console.log(`queryText is: ${queryText} for layerId: ${layerId}`);

  // use regex to extract db column names from user-defined transform
  queryText = queryText.split("SELECT")[1];
  [queryText, tableName] = queryText.split("FROM");
  tableName = tableName.replace(/[\s;]+/g, "").trim();
  queryText = queryText.replace(/\s+/g, "").trim();
  let queryFields = queryText.split(",");

  // find only directly mapped columns from object attributes
  let directMappedColumns = {};
  const objectAttributes = Object.keys(p);
  for (let idx in queryFields) {
      const field = queryFields[idx];
      if (objectAttributes.includes(field)) {
        directMappedColumns[field] = p[field];
      }
  }
  const directMappedColNames = Object.keys(directMappedColumns);

  // remove all popovers first
  // removePopovers(viewId);

  // create popover for editing attributes
  d3.select(".kyrixdiv")
      .append("div")
      .classed("view_" + viewId + " popover fade right in", true)
      .attr("role", "tooltip")
      .attr("id", "updatepopover")
      .append("div")
      .classed("view_" + viewId + " arrow popoverarrow", true)
      .attr("id", "popoverarrow");
  d3.select(viewClass + "#updatepopover")
      .append("h2")
      .classed("view_" + viewId + " popover-title", true)
      .attr("id", "popovertitle")
      .html("Update Attributes")
      .append("a")
      .classed("view_" + viewId + " close", true)
      .attr("href", "#")
      .attr("id", "popoverclose")
      .html("&times;")
      .on("click", function() {
          removePopovers(viewId);
      });
  d3.select(viewClass + "#updatepopover")
      .append("div")
      .classed("view_" + viewId + " popover-content list-group", true)
      .attr("id", "popovercontent");

  // add attribute input boxes
  let updateAttributes = []
  let revFuncDict = gvd.curCanvas.layers[layerId].transform.reverseFunctions;
  for (let idx in queryFields) {
    const field = queryFields[idx];
    if (revFuncDict[field] !== undefined) {
      updateAttributes.push(field);
    }
  } 
  let k;
  let updateBtnIds = [];
  for (k = 0; k < updateAttributes.length; k++) {
      let attrName = "<b>" + updateAttributes[k] + "</b>";
      let attrValue = p[updateAttributes[k]];
      let updateBtnName = "update-button-" + k;
      updateBtnIds.push(updateBtnName);

      let updateAttrs = d3
          .select(viewClass + "#popovercontent")
          .append("div");
          
  
      updateAttrs
          .classed("input-group", true)
          .attr("id", "attr-input-group-" + k);
      
      updateAttrs
          .append("div")
          .classed("input-group-prepend", true)
          .append("span")
          .classed("input-group-text", true)
          .attr("id", "inputGroup-sizing-default")
          .html(attrName);

      updateAttrs
        .append("input")
        .classed("form-control attr-inputs", true)
        .attr("type", "text")
        .attr("id", "attr-input-" + k)
        .attr("value", attrValue);
        // .attr("aria-label", "Default")
        // .attr("aria-describedby", "inputGroup-sizing-default");

      updateAttrs
          .append("span")
          // .classed("popover-footer", true)
          .classed("input-group-btn", true)
          .append("button")
          .classed("btn btn-default", true)
          .attr("id", updateBtnName)
          .attr("type", "button")
          .attr("updateAttr", updateAttributes[k])
          .style("margin-top", "20px")
          .html("Save");
  }

  // add save changes button to bottom of popover
  // d3.select("#attr-input-group-" + (k-1))
  //     .append("div")
  //     .classed("popover-footer", true)
  //     .append("button")
  //     .classed("btn btn-success", true)
  //     .attr("type", "button")
  //     .attr("id", "update-button")
  //     .html("Save");

  // add listener to save changes button, sends updates to backend
  for (let i=0; i < updateBtnIds.length; i++) {
    let btnObj = d3.select(`#${updateBtnIds[i]}`);
    let updateAttr = btnObj.attr("updateAttr");
    let inputId = "#attr-input-" + i;
    btnObj.on("click", function(d) {
      console.log(`update button was clicked with attr: ${updateAttr}`);
      let attrValue = d3.select(inputId).property("value");
      console.log(`new attr value of field: ${updateAttr} is -> ${attrValue}`);
      const viewClass = ".view_" + viewId;
      let newAttrValues = [];
      let objectKV = {};
      console.log(`data p: ${JSON.stringify(p)} and direct mapped cols: ${JSON.stringify(directMappedColNames)}`);
      // d3.selectAll(".attr-inputs").each(function(d,i) {
      //     newAttrValues.push(d3.select(this).property("value"));
      // });
      for (let i=0; i < directMappedColNames.length; i++) {
        let colName = directMappedColNames[i];
        newAttrValues.push(p[colName]);
      }
      for (let i = 0; i < directMappedColNames.length; i++) {
        let colName = directMappedColNames[i];
        objectKV[colName] = newAttrValues[i];
      }
      objectKV[updateAttr] = attrValue;

      console.log(`column names -> ${directMappedColNames}`);
      console.log(`new attr values -> ${JSON.stringify(objectKV)}`);


      // reverse function code
      const reverseFuncString = 
        gvd.curCanvas.layers[layerId].transform.reverseFunctions[
          updateAttr
        ];
      console.log(
        `reverse function string for attr: ${updateAttr} in layer: ${layerId} is ${reverseFuncString}`
      );

      const reverseFunc = Function(reverseFuncString)();
      let width = gvd.curCanvas.w;
      let height = gvd.curCanvas.h;
      console.log(`width of cur layer is: ${width} and height is: ${height}`);
      objectKV = reverseFunc(objectKV, width, height);
      console.log(`attr values after reverse are -> JSON.stringify(objectKV)`);


      // TODO: update UI with new data, while DB gets update asynchronously 
      // what if DB doesn't get update?
      const projName = globalVar.project.name;
      doDBUpdate(viewId, canvasId, layerId, tableName, objectKV, projName);
      // re-load dynamic data from db
      getCurCanvas(viewId);
      if (!gvd.animation) {
          var curViewport = d3
              .select(viewClass + ".mainsvg:not(.static)")
              .attr("viewBox")
              .split(" ");
          RefreshDynamicLayers(
              viewId,
              curViewport[0],
              curViewport[1]
          );
      }
      removePopovers(viewId);
    });
  }
  

  // finally position updates popover according to event x/y and its width/height
  let updatePopoverHeight = d3
      .select(viewClass + "#updatepopover")
      .node()
      .getBoundingClientRect().height;
  let kyrixDivBox = d3
      .select(".kyrixdiv")
      .node()
      .getBoundingClientRect();
  d3.select(viewClass + "#updatepopover")
      .style("left", d3.event.pageX - kyrixDivBox.left + "px")
      .style(
          "top",
          d3.event.pageY - kyrixDivBox.top - updatePopoverHeight / 2 + "px"
  );   
}

// register jump info
function registerJumps(viewId, svg, layerId) {
    var gvd = globalVar.views[viewId];
    var viewClass = ".view_" + viewId;

    var jumps = gvd.curJump;
    var shapes = svg.select("g:last-of-type").selectAll("*");
    var optionalArgs = getOptionalArgs(viewId);
    optionalArgs["layerId"] = layerId;
    
    let layerObj = gvd.curCanvas.layers[layerId];

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
        if (!hasJump && !layerObj.allowUpdates) return;

        // make cursor a hand when hovering over this shape
        d3.select(this).style("cursor", "zoom-in");

        // register onclick listener
        d3.select(this).on("click.popover", function(d) {
            // stop the click event from propagating up
            d3.event.stopPropagation();

            
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

            // create update option in popover
            if (layerObj.allowUpdates) {
              let updateText = "<b>UPDATE ATTRIBUTES in " + gvd.curCanvasId + "</b>";
              let updateJumpOption = d3
                  .select(viewClass + "#popovercontent")
                  .append("a")
                  .classed("list-group-item", true)
                  .attr("href", "#")
                  // .attr("id", "update-button")
                  .datum(d)
                  .html(updateText);

              // if update option selected, set up new popover with options for changing all 
              updateJumpOption.on("click", function(d) {
                createUpdatePopover(gvd, viewId, layerId, p);
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
