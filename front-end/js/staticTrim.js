function renderStaticTrim() {

    // remove old #staticg
    d3.select("#staticg").remove();

    // get static trim function
    var staticTrim = globalVar.curCanvas.staticTrim;
    if (staticTrim == "")
        return ;
    var staticTrimFunc = staticTrim.parseFunction();

    // create #staticg
    if (! globalVar.curCanvas.staticTrimFirst)
        d3.select("#containerSvg")
            .insert("g", "#maing")
            .attr("id", "staticg");
    else
        d3.select("#containerSvg")
            .append("g")
            .attr("id", "staticg");

    // append an svg to #staticg
    d3.select("#staticg")
        .attr("transform", "translate("
            + param.containerPadding
            + ","
            + param.containerPadding
            + ")")
        .append("svg")
        .attr("width", globalVar.viewportWidth)
        .attr("height", globalVar.viewportHeight)
        .attr("id", "staticSvg");

    staticTrimFunc(d3.select("#staticSvg").append("g"), globalVar.staticTrimArguments);
};
