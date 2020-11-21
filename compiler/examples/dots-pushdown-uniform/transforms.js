const Transform = require("../../src/Transform").Transform;

var dotsTransform = new Transform({
    dbsource: "dots_pushdown_uniform",
    transformFunc: function(obj, cw, ch, params) {
        if (!("d3" in plv8)) {
            plv8.d3 = require("d3");
        }
        d3 = plv8.d3;
        if (!("scalex" + cw in plv8))
            plv8["scalex" + cw] = d3
                .scaleLinear()
                .domain([0, params.topLevelWidth])
                .range([0, cw]);
        if (!("scaley" + ch in plv8))
            plv8["scaley" + ch] = d3
                .scaleLinear()
                .domain([0, params.topLevelHeight])
                .range([0, ch]);

        // I'd use arrays for speed then annotate the column names, but plv8 can't return arrays
        // and other serialization is even slower. I didn't try returning a recordset (and then
        // having the caller invoke the func with 1000ish record sets... that could be faster...
        return {
            id: obj.id, // @result: id
            x: plv8["scalex" + cw](obj.w), // @result: x
            y: plv8["scaley" + ch](obj.h) // @result: y
        };
    }
});

module.exports = {
    dotsTransform: dotsTransform
};
