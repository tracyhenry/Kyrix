var renderingParams = {
    textwrap: require("../../src/RendererTemplates").textwrap
};

var flarePackRendering = function(svg, data, args) {
    var g = svg.append("g");
    var params = args.renderingParams;

    // get root json from data, using d3-stratify
    var table = [];
    for (var i = 0; i < data.length; i++) {
        table.push(data[i]);
        // check if this one is root, if so, set its parent_id to -1
        var root = true;
        for (var j = 0; j < data.length; j++)
            if (i != j && data[j].id == data[i].parent_id) root = false;
        if (root) table[i].parent_id = -1;
    }

    // calculate coordinates
    var pack = d3.pack().size([1000, 1000]);
    var root = d3
        .stratify()
        .id(function(d) {
            return d.id;
        })
        .parentId(function(d) {
            return d.parent_id == -1 ? "" : d.parent_id;
        })(table);
    root = d3
        .hierarchy(root)
        .sum(function(d) {
            return d.data.size;
        })
        .sort(function(a, b) {
            return b.value - a.value;
        });
    root = pack(root).descendants();
    var dict = {};
    for (var i = 0; i < root.length; i++) dict[root[i].data.data.id] = root[i];

    // render
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("r", function(d) {
            return dict[d.id].r;
        })
        .attr("cx", function(d) {
            return dict[d.id].x;
        })
        .attr("cy", function(d) {
            return dict[d.id].y;
        })
        .style("fill-opacity", 0.25)
        .attr("fill", "honeydew")
        .attr("stroke", "#ADADAD")
        .style("stroke-width", "1px");
    g.selectAll("text")
        .data(data)
        .enter()
        .append("text")
        .filter(function(d) {
            return !dict[d.id].children;
        })
        .attr("dy", "0.3em")
        .text(function(d) {
            return d.name;
        })
        .attr("font-size", function(d) {
            return (dict[d.id].r / 1000) * 300;
        })
        .attr("x", function(d) {
            return dict[d.id].x;
        })
        .attr("y", function(d) {
            return dict[d.id].y;
        })
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("fill-opacity", 1)
        .style("fill", "navy")
        .each(function(d) {
            params.textwrap(d3.select(this), dict[d.id].r * 1.5);
        });
};

module.exports = {
    renderingParams: renderingParams,
    flarePackRendering: flarePackRendering
};
