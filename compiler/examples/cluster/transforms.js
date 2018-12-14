const Transform = require("../../src/index").Transform;

var scales = [];
for (var i = 0; i < 7; i ++) {
    var curScale = new Transform("scalexy",
        "select * from segmap where level<=" + i + ";",
        "mghdata",
        function (row, width, height) {
            var ret = [];
            ret.push(row[0]);
            ret.push(d3.scaleLinear().domain([679, 698]).range([0, width])(row[1]));
            ret.push(d3.scaleLinear().domain([632, 665]).range([0, height])(row[2]));
            ret.push(row[3]);
            return Java.to(ret, "java.lang.String[]");
        },
        ["id", "x", "y", "color"],
        true
    );
    scales.push(curScale);
}

module.exports = {
    scales : scales
};