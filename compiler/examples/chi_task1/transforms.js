const Transform = require("../../src/index").Transform;

var scPlotTransform = new Transform("scalexy",
    "select * from scatterplot;",
    "wenbo",
    function (row, width, height) {
        var ret = [];
        ret.push(row[0]);
        ret.push(d3.scaleLinear().domain([0, 100000]).range([0, width])(row[1]));
        ret.push(d3.scaleLinear().domain([0, 100000]).range([0, height])(row[2]));
        return Java.to(ret, "java.lang.String[]");
    },
    ["id", "x", "y"],
    true
);

var emptyTransform = new Transform("empty",
    "",
    "",
    function (row) {}, [], true);

module.exports = {
    scPlotTransform : scPlotTransform,
    emptyTransform : emptyTransform
};
