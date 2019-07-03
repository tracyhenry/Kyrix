var renderingParams = {
    rownumber: [1, 4, 8],
    colnumber: [1, 8, 16],
    blockwidth: [2548, 1260, 5040],
    blockheight: [976, 965, 3860],
    canvaswidth: [2548, 10080, 80640],
    canvasheight: [976, 3860, 30880],
    arboreal: [0, 910, 7474, 804],
    aquatic: [[3602, 1680, 723, 406], [5628, 1564, 841, 697]],
    wet_area: [[3364, 1396, 1196, 387], [5456, 1200, 1500, 282]],
    ground: [0, 1706, 7136, 54],
    underground: [0, 1729, 7166, 144],
    sky: [0, 0, 10080, 1559],
    benthopelagic: [7163, 1670, 2917, 1370],
    demersal: [8532, 3040, 1548, 715],
    pelagic: [9518, 2017, 562, 1033]
};

var backgroundRendering = function(svg, data, args) {
    g = svg.append("g");
    var params = args.renderingParams;

    g.selectAll("image")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function(d) {
            return (
                +d.x -
                params.blockwidth[+d.canvas_id - 1] / 2 -
                ((+d.id - 1) % params.colnumber[+d.canvas_id - 1])
            );
        })
        .attr("y", function(d) {
            return (
                +d.y -
                params.blockheight[+d.canvas_id - 1] / 2 -
                Math.floor((+d.id - 1) / params.colnumber[+d.canvas_id - 1])
            );
        })
        .attr("width", function(d) {
            return params.blockwidth[+d.canvas_id - 1];
        })
        .attr("height", function(d) {
            return params.blockheight[+d.canvas_id - 1];
        })
        .attr("xlink:href", function(d) {
            return (
                "https://farm" +
                d.farm_id +
                ".staticflickr.com/" +
                d.url +
                "_o.jpg"
            );
        });
};

var animalCircleRendering = function(svg, data) {
    g = svg.append("g");
    g.selectAll("animalcircle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {
            return +d.x;
        })
        .attr("cy", function(d) {
            return +d.y;
        })
        .attr("r", function(d) {
            return +d.r;
        })
        .attr("fill", "white");
};

var animalIconRendering = function(svg, data) {
    g = svg.append("g");
    g.selectAll("image")
        .data(data)
        .enter()
        .append("image")
        .attr("x", function(d) {
            var myPicXO = new Image();
            myPicXO.src = d.url;
            return +d.x - myPicXO.width / 2;
        })
        .attr("y", function(d) {
            var myPicXO = new Image();
            myPicXO.src = d.url;
            return +d.y - myPicXO.height;
        })
        .attr("xlink:href", function(d) {
            return d.url;
        });
    g.selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .text(function(d) {
            return d.species;
        })
        .attr("x", function(d) {
            return +d.x;
        })
        .attr("y", function(d) {
            return +d.y;
        })
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .attr("fill", "white");
};

module.exports = {
    renderingParams: renderingParams,
    backgroundRendering: backgroundRendering,
    animalCircleRendering: animalCircleRendering,
    animalIconRendering: animalIconRendering
};
