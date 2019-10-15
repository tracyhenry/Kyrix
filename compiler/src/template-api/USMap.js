const getBodyStringOfFunction = require("./Renderers").getBodyStringOfFunction;
const checkArgs = require("./Renderers").checkArgs;

/* 
 * Constructor of a USMap
 * @param args
 * @constructor
 * by nyrret on 09/24/19
 */

// return USMap obj for use increating USMap project
function USMap(args) {
  if (args == null) args = {};

  // verify and store args
  var requiredArgs = ["db", "table", "rate_col"];
  var requiredArgTypes = ["string", "string", "string"];
  checkArgs("USMap", requiredArgs, requiredArgTypes, args);

  this.db = args.db
  this.table = args.table;
  this.rate_col = args.rate_col;
  this.renderers = args.renderers;
  this.renderingParams = args.renderingParams;
  this.transforms = args.transforms;
  this.placements = args.placements;
} // end USMap constructor

function getUSMapTransformFunc() {
} // end func getUSMapTransformFunc

// @param: specify name of renderer
function getUSMapRenderer(renderer) {
  // decide which renderer to use
  var renderFuncBody;
  switch(renderer) {
      case "stateMapRendering":
          renderFuncBody = getBodyStringOfFunction(stateMapRendering);
          break;
      case "stateMapLegendRendering":
          renderFuncBody = getBodyStringOfFunction(stateMapLegendRendering);
          break;
      case "countyMapStateBoundaryRendering":
          renderFuncBody = getBodyStringOfFunction(countyMapStateBoundaryRendering);
          break;
      case "countyMapLegendRendering":
          renderFuncBody = getBodyStringOfFunction(countyMapLegendRendering);
          break;
      case "countyMapRendering":
          renderFuncBody = getBodyStringOfFunction(countyMapRendering);
          break;
      default:
          // do nothing
  }

  // replace any args passed in by the user
  /*renderFuncBody = renderFuncBody.replace(
    /REPLACE_ME_table_name/g,
    this.name
  );*/

  return new Function("svg", "data", "args", renderFuncBody);

  // --------- Rendering Funcs ------------------
  function stateMapRendering(svg, data, args) {
      var g = svg.append("g");
      var width = args.canvasW,
          height = args.canvasH;
      var param = args.renderingParams;

      var projection = d3
          .geoAlbersUsa()
          .scale(param.stateMapScale)
          .translate([width / 2, height / 2]);
      var path = d3.geoPath().projection(projection);

      var color = d3
          .scaleThreshold()
          .domain(d3.range(0, param.stateScaleRange, param.stateScaleStep))
          .range("colorScheme" in args ? args.colorScheme : d3.schemeYlOrRd[9]);

      g.selectAll("path")
          .data(data)
          .enter()
          .append("path")
          .attr("d", function(d) {
              var feature = JSON.parse(d.geomstr);
              return path(feature);
          })
          .style("stroke", "#fff")
          .style("stroke-width", "0.5")
          .style("fill", function(d) {
              return color(d.crimerate);
          });
    }  // end stateMapRendering

    function stateMapLegendRendering(svg, data, args) {
        // parameters
        var bkgRectWidth = 600;
        var bkgRectXOffset = 200;
        var legendRectStartXOffset = bkgRectWidth + bkgRectXOffset - 60;
        var legendRectY = 32;
        var legendRectWidth = 60;
        var legendRectHeight = 16;
        var captionY = 20;
        var captionFontSize = 22;
        var tickFontSize = 12;

        var g = svg.append("g");
        var width = args.viewportW;
        var param = args.renderingParams;

        // rectangles representing colors
        var color = d3
            .scaleThreshold()
            .domain(d3.range(0, param.stateScaleRange, param.stateScaleStep))
            .range("colorScheme" in args ? args.colorScheme : d3.schemeYlOrRd[9]);
        g.selectAll(".legendrect")
            .data(color.range().slice(1))
            .enter()
            .append("rect")
            .attr("x", function(d, i) {
                return width - legendRectStartXOffset + i * legendRectWidth;
            })
            .attr("y", legendRectY)
            .attr("width", legendRectWidth)
            .attr("height", legendRectHeight)
            .attr("fill", function(d) {
                return d;
            });

        // caption text: crime rate per 100,000 people
        g.append("text")
            .attr("x", width - bkgRectWidth - bkgRectXOffset)
            .attr("y", captionY)
            .attr("fill", "#000")
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .attr("font-size", captionFontSize)
            .text("Crime rate per 100,000 people");

        // axis ticks
        var axisScale = d3
            .scaleLinear()
            .domain([0, 490])
            .rangeRound([
                width - legendRectStartXOffset,
                width - legendRectStartXOffset + 7 * legendRectWidth
            ]);
        var axis = g
            .append("g")
            .attr("transform", "translate(0, " + legendRectY + ")")
            .call(
                d3
                    .axisBottom(axisScale)
                    .tickSize(23)
                    .tickValues(color.domain())
            );
        axis.style("font-size", tickFontSize);
        axis.select(".domain").remove();
    } // end stateMapLegendRendering

    function countyMapStateBoundaryRendering(svg, data, args) {
        g = svg.append("g");
        var width = args.canvasW,
            height = args.canvasH;
        var param = args.renderingParams;

        var projection = d3
            .geoAlbersUsa()
            .scale(param.countyMapScale)
            .translate([width / 2, height / 2]);
        var path = d3.geoPath().projection(projection);

        g.selectAll("path")
            .data(data)
            .enter()
            .append("path")
            .attr("d", function(d) {
                var feature = JSON.parse(d.geomstr);
                return path(feature);
            })
            .style("stroke", "#fff")
            .style("stroke-width", "4")
            .style("fill", "none");
    } // end countyMapStateBoundaryRendering 

    function countyMapLegendRendering(svg, data, args) {
        // parameters
        var bkgRectWidth = 570;
        var bkgRectHeight = 80;
        var bkgRectXOffset = 50;
        var legendRectStartXOffset = bkgRectWidth + bkgRectXOffset - 60;
        var legendRectY = 32;
        var legendRectWidth = 60;
        var legendRectHeight = 16;
        var captionY = 20;
        var captionFontSize = 22;
        var tickFontSize = 12;

        var g = svg.append("g");
        var width = args.viewportW;
        var param = args.renderingParams;

        // append a background rectangle
        g.append("rect")
            .attr("x", width - bkgRectWidth - bkgRectXOffset)
            .attr("y", 0)
            .attr("width", bkgRectWidth)
            .attr("height", bkgRectHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", "#fff");

        // rectangles representing colors
        var color = d3
            .scaleThreshold()
            .domain(d3.range(0, param.countyScaleRange, param.countyScaleStep))
            .range(d3.schemeYlOrRd[9]);
        g.selectAll(".legendrect")
            .data(color.range().slice(1))
            .enter()
            .append("rect")
            .attr("x", function(d, i) {
                return width - legendRectStartXOffset + i * legendRectWidth;
            })
            .attr("y", legendRectY)
            .attr("width", legendRectWidth)
            .attr("height", legendRectHeight)
            .attr("fill", function(d) {
                return d;
            });

        // caption text: crime rate per 100,000 people
        g.append("text")
            .attr("x", width - bkgRectWidth - bkgRectXOffset + 10)
            .attr("y", captionY)
            .attr("fill", "#000")
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .attr("font-size", captionFontSize)
            .text("Crime rate per 100,000 people");

        // axis ticks
        var axisScale = d3
            .scaleLinear()
            .domain([0, 1750])
            .rangeRound([
                width - legendRectStartXOffset,
                width - legendRectStartXOffset + 7 * legendRectWidth
            ]);
        var axis = g
            .append("g")
            .attr("transform", "translate(0, " + legendRectY + ")")
            .call(
                d3
                    .axisBottom(axisScale)
                    .tickSize(23)
                    .tickValues(color.domain())
            );
        axis.style("font-size", tickFontSize);
        axis.select(".domain").remove();
    } // end countyMapLegendRendering 

    function countyMapRendering(svg, data, args) {
        g = svg.append("g");
        var width = args.canvasW,
            height = args.canvasH;
        var param = args.renderingParams;

        var projection = d3
            .geoAlbersUsa()
            .scale(param.countyMapScale)
            .translate([width / 2, height / 2]);

        var path = d3.geoPath().projection(projection);

        var color = d3
            .scaleThreshold()
            .domain(d3.range(0, param.countyScaleRange, param.countyScaleStep))
            .range(d3.schemeYlOrRd[9]);

        g.selectAll("path")
            .data(data)
            .enter()
            .append("path")
            .attr("d", function(d) {
                var feature = JSON.parse(d.geomstr);
                return path(feature);
            })
            .style("stroke", "#fff")
            .style("stroke-width", "0.5")
            .style("fill", function(d) {
                return color(d.crimerate);
            })
            .on("mouseover", function(d, i) {
                // remove all tool tips first
                d3.select("body")
                    .selectAll(".countymaptooltip")
                    .remove();
                // create a new tooltip
                var tooltip = d3
                    .select("body")
                    .append("div")
                    .attr("id", "countyMapTooltip" + i)
                    .classed("countymaptooltip", true)
                    .style("position", "absolute")
                    .style("width", "200px")
                    .style("height", "28px")
                    .style("pointer-events", "none")
                    .style("opacity", 0)
                    .style("font-size", "23px")
                    .style("color", "rgb(134, 142, 112)");
                tooltip
                    .transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltip
                    .html(d.name + "\n" + d.crimerate)
                    .style("left", d3.event.pageX + "px")
                    .style("top", d3.event.pageY + "px");
            })
            .on("mouseout", function(d, i) {
                d3.select("#countyMapTooltip" + i).remove();
            });
    } // end countyMapRendering 
} // end func getUSMapRenderer

USMap.prototype = {
  getUSMapTransformFunc,
  getUSMapRenderer
};

module.exports = {
  USMap: USMap,
  getUSMapTransformFunc,
  getUSMapRenderer
};
