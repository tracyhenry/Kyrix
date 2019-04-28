const Transform = require("../../src/Transform").Transform;

var dotsTransform = new Transform({
    dbsource: "dots_pushdown_uniform",
    transformFunc: function (id, w, h) {
        if (!('dots_pushdown_uniform_xscale' in plv8)) { // memoize for performance
            d3=require('d3');
            plv8.dots_pushdown_uniform_xscale = d3.scaleLinear().domain([0, 100000]).range([0, plv8.canvas_width]);
            plv8.dots_pushdown_uniform_yscale = d3.scaleLinear().domain([0, 100000]).range([0, plv8.canvas_height]);
      };
      // I'd use arrays for speed then annotate the column names, but plv8 can't return arrays.
      return {
        id: id, // @result: id
        x: plv8.dots_pushdown_uniform_xscale(w), // @result: x
        y: plv8.dots_pushdown_uniform_yscale(h), // @result: y
      }; 
    }
});

module.exports = {
    dotsTransform : dotsTransform
};
