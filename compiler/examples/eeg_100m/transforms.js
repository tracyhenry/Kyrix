const Transform = require("../../src/index").Transform;

var eegTransform = new Transform("eegTransform",
    "select * from eeg100m;",
    "mghdata",
    function (row, width) {
        var ret = [];
        var pixelPerSeg = width / 43200;
        //id
        ret.push(row[0]);

        // x
        ret.push(row[1] * (pixelPerSeg == 200 ? 1 : 2));

        // y
        var y = d3.scaleLinear().domain([-500, 500])
            .range([0, 75])(+row[2]) + (+row[3]) * 80;
        ret.push(y);

        // channel_id
        ret.push(row[3]);

        return Java.to(ret ,"java.lang.String[]");
    },
    ["id", "x", "y", "channel_id"],
    true
    );

var emptyTransform = new Transform("emptytransform",
    "",
    "",
    function () {
    },
    [],
    true);

module.exports = {
    eegTransform : eegTransform,
    emptyTransform : emptyTransform
};
