const Transform = require("../../src/index").Transform;

const zoomFactor = 2;
const numLevels = 5;

var scales = [];
for (var i = 0; i < numLevels; i ++) {
    var curScale = new Transform("scalexy",
        "select * from scatterplot where tier<=" + i + ";",
        "wenbo",
        function (row, width, height) {
            var ret = [];
            ret.push(row[0]);
            ret.push(d3.scaleLinear().domain([0, 100000]).range([0, width])(row[1]));
            ret.push(d3.scaleLinear().domain([0, 100000]).range([0, height])(row[2]));
            ret.push(row[3]);
            return Java.to(ret, "java.lang.String[]");
        },
        ["id", "x", "y", "tier"],
        true
    );
    scales.push(curScale);
}

var emptyTransform = new Transform("empty",
    "",
    "",
    function (row) {}, [], true);

module.exports = {
    scales : scales,
    numLevels : numLevels,
    zoomFactor : zoomFactor,
    emptyTransform : emptyTransform
};
