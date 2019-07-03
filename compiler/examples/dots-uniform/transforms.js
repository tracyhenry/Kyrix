const Transform = require("../../src/Transform").Transform;

var dotsTransform = new Transform(
    "select * from dots_uniform;",
    "dots_uniform",
    function(row, width, height) {
        var ret = [];
        ret.push(row[0]);
        ret.push(
            d3
                .scaleLinear()
                .domain([0, 100000])
                .range([0, width])(row[1])
        );
        ret.push(
            d3
                .scaleLinear()
                .domain([0, 100000])
                .range([0, height])(row[2])
        );
        return Java.to(ret, "java.lang.String[]");
    },
    ["id", "x", "y"],
    true
);

module.exports = {
    dotsTransform: dotsTransform
};
