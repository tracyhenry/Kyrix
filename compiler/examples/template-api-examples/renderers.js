var unit = 15;

var renderingParams = {
    rectPlayer: {
        w: 12 * unit,
        h: 16 * unit
    },
    photo: {
        x: 3 * unit,
        y: 0 * unit,
        w: 9 * unit,
        h: 9 * unit
    },
    flag: {
        x: 1 * unit,
        y: 4 * unit,
        w: 2 * unit,
        h: 2 * unit
    },
    club_logo: {
        x: 1 * unit,
        y: 6 * unit,
        w: 2 * unit,
        h: 2 * unit
    },
    rating: {
        x: 2 * unit,
        y: 1 * unit,
        "font-size": 2 * unit
    },
    position: {
        x: 2 * unit,
        y: 3 * unit,
        "font-size": 1 * unit
    },
    name: {
        x: 6 * unit,
        y: 9 * unit,
        "font-size": 1 * unit
    },
    attrs: {
        x: 0 * unit,
        y: 10 * unit,
        w: 12 * unit,
        h: 8 * unit,
        "font-size": 1.2 * unit
    }
};

function playerRendering(svg, data, args) {
    var g = svg.append("g").attr("class", "player object");
    var params = args.renderingParams;

    var basex = d => +d.cx - +params.rectPlayer.w / 2;
    var basey = d => +d.cy - +params.rectPlayer.h / 2;

    g.selectAll("rect.player-bg")
        .data(data)
        .enter()
        .append("rect")
        .classed("player-bg", true)
        .attr("x", basex)
        .attr("y", basey)
        .attr("rx", 10)
        .attr("ry", 10)
        .attr("width", params.rectPlayer.w)
        .attr("height", params.rectPlayer.h)
        .classed("kyrix-retainsizezoom", true);

    var imgs = ["photo", "flag", "club_logo"];
    for (var i = imgs.length - 1; i >= 0; i--) {
        g.selectAll("." + imgs[i])
            .data(data)
            .enter()
            .append("image")
            .attr("x", function(d) {
                return basex(d) + params[imgs[i]].x;
            })
            .attr("y", function(d) {
                return basey(d) + params[imgs[i]].y;
            })
            .attr("width", params[imgs[i]].w)
            .attr("height", params[imgs[i]].h)
            .attr("xlink:href", d => d[imgs[i]])
            .classed(imgs[i], true)
            .attr("opacity", 1)
            .classed("kyrix-retainsizezoom", true);
    }

    var infos = ["rating", "position", "name"];
    for (var i = infos.length - 1; i >= 0; i--) {
        g.selectAll("." + infos[i])
            .data(data)
            .enter()
            .append("text")
            .classed(infos[i], true)
            .text(function(d) {
                return d[infos[i]];
            })
            .attr("x", function(d) {
                return basex(d) + params[infos[i]].x;
            })
            .attr("y", function(d) {
                return basey(d) + params[infos[i]].y;
            })
            .attr("font-size", params[infos[i]]["font-size"])
            .attr("dy", "1em")
            .attr("text-anchor", "middle")
            .classed("kyrix-retainsizezoom", true);
    }

    var attrs = [
        "defending",
        "general",
        "mental",
        "passing",
        "mobility",
        "power",
        "rating",
        "shooting"
    ];

    for (var i = attrs.length - 1; i >= 0; i--) {
        g.selectAll("." + attrs[i].substr(0, 3).toUpperCase())
            .data(data)
            .enter()
            .append("text")
            .classed(attrs[i].substr(0, 3).toUpperCase(), true)
            .text(d => {
                // console.log(i, attrs[i], d[attrs[i]]);
                return d[attrs[i]] + " " + attrs[i].substr(0, 3).toUpperCase();
            })
            .attr(
                "x",
                d => basex(d) + ((i > 3 ? 1.5 : 0.5) * params.attrs.w) / 2
            )
            .attr(
                "y",
                d =>
                    basey(d) +
                    params.attrs.y +
                    (i % 4) * params.attrs["font-size"]
            )
            .attr("font-size", params.attrs["font-size"])
            .attr("dy", "1em")
            .attr("text-anchor", "middle")
            .classed("kyrix-retainsizezoom", true);
    }
}

var playerRenderingStyles = `
g.player rect.player-bg {
    fill: #fff;
    stroke: #ccc;
    stroke-width: 3;
}

text.label {
    text-anchor: start;
}`;

module.exports = {
    playerRendering,
    playerRenderingStyles,
    renderingParams
};
