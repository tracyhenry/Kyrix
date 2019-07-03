const Transform = require("../../src/Transform").Transform;

var dotsTransform = new Transform({
    dbsource: "dots_pushdown_uniform",
    transformFunc: function(id, w, h) {
        if (!("dots_pushdown_uniform_xscale" in plv8)) {
            // memoize for performance
            d3 = require("d3");
            plv8.dots_pushdown_uniform_xscale = d3
                .scaleLinear()
                .domain([0, 100000])
                .range([0, CANVAS_WIDTH]);
            plv8.dots_pushdown_uniform_yscale = d3
                .scaleLinear()
                .domain([0, 100000])
                .range([0, CANVAS_HEIGHT]);
        }
        // I'd use arrays for speed then annotate the column names, but plv8 can't return arrays
        // and other serialization is even slower. I didn't try returning a recordset (and then
        // having the caller invoke the func with 1000ish record sets... that could be faster...
        return {
            id: id, // @result: id
            x: plv8.dots_pushdown_uniform_xscale(w), // @result: x
            y: plv8.dots_pushdown_uniform_yscale(h) // @result: y
        };
    }
});

module.exports = {
    dotsTransform: dotsTransform
};
