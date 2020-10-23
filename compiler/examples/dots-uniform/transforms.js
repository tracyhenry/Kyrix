const Transform = require("../../src/Transform").Transform;

var dotsTransform = new Transform(
    "select * from dots_uniform;",
    "dots_uniform",
    function(row, width, height, params) {
        var ret = [];
        ret.push(row[0]);
        ret.push(
            d3
                .scaleLinear()
                .domain([0, params.topLevelWidth])
                .range([0, width])(row[1])
        );
        ret.push(
            d3
                .scaleLinear()
                .domain([0, params.topLevelHeight])
                .range([0, height])(row[2])
        );
        return Java.to(ret, "java.lang.String[]");
    },
    {
      "id": function (oldRow, width, height) { return oldRow; },
      "x": function (oldRow, width, height) { return oldRow; },
      // TODO: provide default function for rows that don't need reversing...
      "y": function (oldRow, width, height) { return oldRow; },
  },
    true
);

module.exports = {
    dotsTransform
};
