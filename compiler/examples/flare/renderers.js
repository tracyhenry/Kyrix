var renderingParams = {"textwrap" : function textwrap(text, width) {
        text.each(function() {
            var text = d3.select(this),
                words = text.text().split(/(?=[A-Z])/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.3, // ems
                x = text.attr("x"),
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy")),
                tspan = null;

            text.text(null);
            while (word = words.pop()) {

                if (line.length == 0)
                    tspan = text.append("tspan").attr("x", x).attr("y", y);
                line.push(word);
                tspan.text(line.join(""));
                if (tspan.node().getComputedTextLength() > width) {
                    var popped = false;
                    if (line.length > 1) {line.pop(); popped = true;}
                    tspan.text(line.join(""));
                    if (popped) {
                        line = [word];
                        tspan = text.append("tspan").attr("x", x).attr("y", y).text(word);
                    }
                    else line = [];
                }
            }
            var tspans = text.selectAll("tspan"), num_tspans = tspans.size();
            var firstY;
            if (num_tspans % 2 == 0)
                firstY = - (num_tspans / 2 - 0.5) * lineHeight;
            else
                firstY = - Math.floor(num_tspans / 2) * lineHeight;
            tspans.attr("dy", function (d, i) {
                return (firstY + lineHeight * i) + 0.3 + "em";
            });
        });
    }
};

var flarePackRendering = function (svg, data, width, height, params) {

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
        .style("fill-opacity", .25)
        .attr("fill", "honeydew")
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
        .text(function (d) {return d[1];})
        .attr("font-size", function (d) {return dict[d[0]].r / 1000 * 300;})
        .attr("x", function(d) {return dict[d[0]].x;})
        .attr("y", function(d) {return dict[d[0]].y;})
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1)
        .style("fill", "navy")
        .each(function (d) {
            params.textwrap(d3.select(this), dict[d[0]].r * 1.5);
        });
};

module.exports = {
    renderingParams : renderingParams,
    flarePackRendering : flarePackRendering
};
