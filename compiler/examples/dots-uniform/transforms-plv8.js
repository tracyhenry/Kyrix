// THIS NEW SYNTAX HAS NOT BEEN THOROUGHLY TESTED NOR INTEGRATED
const Transform = require("../../src/Transform").Transform;

var dotsTransform = new Transform(
    "select * from dots_uniform;",
    "kyrix",
    function(obj, cw, ch, params) {
        if (!("d3" in plv8)) {
            plv8.d3 = require("d3");
        }
        var d3 = plv8.d3;
        var x = d3
            .scaleLinear()
            .domain([0, params.topLevelWidth])
            .range([0, cw])(obj.w);
        var y = d3
            .scaleLinear()
            .domain([0, params.topLevelHeight])
            .range([0, ch])(obj.h);

        return {
            id: obj.id,
            x: x,
            y: y
        };
    },
    ["id", "x", "y"],
    true
);

module.exports = {
    dotsTransform
};
