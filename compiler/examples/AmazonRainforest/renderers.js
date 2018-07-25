var renderingParams = {
    "rownumber" : [1, 4, 8],
    "colnumber" : [1, 8, 16],
    "blockwidth" : [2548, 1260, 5040],
    "blockheight" : [976, 965, 3860],
    "canvaswidth" : [2548, 10080, 80640],
    "canvasheight" : [976, 3860, 30880],
    "arboreal" : [0, 910, 7474, 804],
    "aquatic" : [[3602, 1680, 723, 406], [5628, 1564, 841, 697]],
    "wet_area" : [[3364, 1396, 1196, 387], [5456, 1200, 1500, 282]],
    "ground" : [0, 1706, 7136, 54],
    "underground" : [0, 1729, 7166, 144],
    "sky" : [0, 0, 10080, 1559],
    "benthopelagic" : [7163, 1670, 2917, 1370],
    "demersal" : [8532, 3040, 1548, 715],
    "pelagic" : [9518, 2017, 562, 1033]
};

var backgroundRendering = function (svg, data, width, height, params) {

    g = svg.append("g");
    g.selectAll("image")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function (d) {return d[1] - params.blockwidth[d[3]-1]/2 - ((d[0]-1) % params.colnumber[d[3]-1]);})
        .attr("y", function (d) {return d[2] - params.blockheight[d[3]-1]/2 - Math.floor((d[0]-1) / params.colnumber[d[3]-1]);})
        .attr("width", function (d) {return params.blockwidth[d[3]-1];})
        .attr("height", function (d) {return params.blockheight[d[3]-1];})
        .attr("xlink:href", function (d) {return "https://farm" + d[4] + ".staticflickr.com/" + d[5] + "_o.jpg";});
};

var animalCircleRendering = function (svg, data, width, height, params) {
    g = svg.append("g");
    g.selectAll("animalcircle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function (d) {return d[5];})
        .attr("cy", function (d) {return d[6];})
        .attr("r", function (d) {return d[7];})
        .attr("fill", "white");
};

var animalIconRendering = function (svg, data, width, height, params) {

    g = svg.append("g");
    // g.selectAll("animalicon")
    //     .data(data)
    //     .enter()
    //     .append("circle")
    //     .attr("cx", function (d) {return d[5];})
    //     .attr("cy", function (d) {return d[6];})
    //     .attr("r", function (d) {return d[7];})
    //     .attr("fill", "white")
    //     .style("fill-opacity", 0.5);
    g.selectAll("image")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function (d) {
            var myPicXO = new Image();
            myPicXO.src = d[8];
            return d[5] - myPicXO.width/2;
        })
        .attr("y", function (d) {
            var myPicXO = new Image();
            myPicXO.src = d[8];
            return d[6] - myPicXO.height;
        })
        /*
        .attr("width", function (d) {
            var myPicXO = new Image();
            myPicXO.src = d[8];
            return myPicXO.width;
        })
        .attr("height", function (d) {
            var myPicXO = new Image();
            myPicXO.src = d[8];
            return myPicXO.height;
        })
        */
        .attr("xlink:href", function (d) {return d[8];});
    g.selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {return d[2];})
        .attr("x", function(d) {return d[5];})
        .attr("y", function(d) {return d[6];})
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .attr("fill", "white");

};

var svgbackgroundRendering = function (svg, data, width, height, params) {

    g = svg.append("g");
    g.selectAll("image")
        .data(data)
        .enter()
        .append("path")
        .attr("d", function (d) {return d[1];})
        .attr("stroke", function (d) {return d[2];})
        .attr("stroke-width", "10pt")
        .attr("fill", function (d) {return d[3];})
        .attr("transform", function (d) {return "translate(" + (d[4] - 585) + " " + (d[5] - 448) + ")"});
};

module.exports = {
    renderingParams : renderingParams,
    backgroundRendering : backgroundRendering,
    animalCircleRendering : animalCircleRendering,
    animalIconRendering : animalIconRendering,
    svgbackgroundRendering : svgbackgroundRendering
};
