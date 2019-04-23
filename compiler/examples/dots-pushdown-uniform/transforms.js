const Transform = require("../../src/Transform").Transform;

var dotsTransform = new Transform({
    dbsource: "dots_pushdown_uniform",
    transformFunc: function (id, w, h) {
        return [
            id,  // @result: id
            d3.scaleLinear().domain([0, 100000]).range([0, kyrix.width])(w),  // @result: x
            d3.scaleLinear().domain([0, 100000]).range([0, kyrix.height])(h), // @result: y
        ];
    }
});

module.exports = {
    dotsTransform : dotsTransform
};
