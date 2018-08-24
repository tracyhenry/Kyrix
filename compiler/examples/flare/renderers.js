var renderingParams = {};

var flarePackRendering = function (svg, data) {

    var g = svg.append("g");

    // get root json from data, using d3-stratify
    var table = [];
    for (var i = 0; i < data.length; i ++) {

        table.push({
            "id": data[i][0],
            "name": data[i][1],
            "size": data[i][2],
            "parent_id": data[i][3],
            "depth": data[i][4]
        });

        // check if this one is root, if so, set its parent_id to -1
        var root = true;
        for (var j = 0; j < data.length; j ++)
            if (i != j && data[j][0] == data[i][3])
                root = false;
        if (root)
            table[i].parent_id = -1;
    }

    // calculate coordinates
    var pack = d3.pack()
        .size([1000, 1000]);
    var root = d3.stratify()
        .id(function (d) {return d.id;})
        .parentId(function (d) {return d.parent_id == -1 ? "" : d.parent_id;})
        (table);
    root = d3.hierarchy(root)
        .sum(function (d) {
            return d.data.size;
        })
        .sort(function (a, b) {
            return b.value - a.value;
        });
    root = pack(root).descendants();
    var dict = {};
    for (var i = 0; i < root.length; i ++)
        dict[root[i].data.data.id] = root[i];

    // render
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("r", function (d) {return dict[d[0]].r;})
        .attr("cx", function (d) {return dict[d[0]].x;})
        .attr("cy", function (d) {return dict[d[0]].y;})
//        .attr("fill", "rgb(174, 237, 242)")//"rgb(181, 204, 242)")//"rgb(31, 119, 180)")
        .style("fill-opacity", .25)
//        .style("stroke", "rgb(31, 119, 180)")
        .attr("fill", "honeydew")
        .attr("opacity", function (d) {
            return d[4] / 5 + 0.2;
        })
        .attr("stroke", "#ADADAD")
        .style("stroke-width", "1px");
    g.selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .filter(function (d) {
            return ! dict[d[0]].children;
        })
        .attr("dy", "0.3em")
        .text(function (d) {
            return d[1].substring(0, dict[d[0]].r / 5);
        })
        .attr("x", function(d) {return dict[d[0]].x;})
        .attr("y", function(d) {return dict[d[0]].y;})
        .attr("font-size", 25)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1)
        .style("fill", "navy")
        .attr("opacity", function (d) {
            return d[4] / 5 + 0.2;
        });
};

module.exports = {
    renderingParams : renderingParams,
    flarePackRendering : flarePackRendering
};
