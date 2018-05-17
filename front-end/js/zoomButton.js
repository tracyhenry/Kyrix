// is called on page load, and on page resize
function initiateZoomButtons() {

    console.log("fffffff");
    // create buttons if not existed
    if (d3.select("#zoominbutton").empty())
        d3.select("body")
            .append("button")
            .attr("id", "zoominbutton")
            .attr("disabled", "true")
            .style("width", "120px")
            .classed("btn", true)
            .classed("btn-default", true)
            .html("<span class=\"glyphicon glyphicon-zoom-in\"></span>&nbsp;&nbsp;zoom in&nbsp;&nbsp;");
    if (d3.select("#zoomoutbutton").empty())
        d3.select("body")
            .append("button")
            .attr("id", "zoomoutbutton")
            .attr("disabled", "true")
            .style("width", "120px")
            .classed("btn", true)
            .classed("btn-default", true)
            .html("<span class=\"glyphicon glyphicon-zoom-out\"></span>&nbsp;&nbsp;zoom out");

    // get client bounding rect of #containerSvg
    var bbox = d3.select("#containerSvg").node().getBoundingClientRect();

    // position the buttons
    d3.select("#zoominbutton")
        .style("top", (+bbox.top + bbox.bottom) / 2 - 20 + "px")
        .style("left", (bbox.right + 20) + "px");
    d3.select("#zoomoutbutton")
        .style("top", (+bbox.top + bbox.bottom) / 2 + 20 + "px")
        .style("left", (bbox.right + 20) + "px");

};

