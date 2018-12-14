const Transform = require("../../src/index").Transform;

var eegTransform = new Transform("eegTransform",
    "select * from eeglarge",
    "mghdata",
    function (row, width) {
        var ret = [];
        var pixelPerSeg = width / 43200;
        ret.push(row[3]);
        ret.push(pixelPerSeg);
        ret.push(+row[3] * pixelPerSeg + pixelPerSeg / 2);
        for (var i = 4; i < 24; i ++)
            ret.push(row[i]);
        return Java.to(ret ,"java.lang.String[]");
    },
    ["sid", "pps", "ctr_x", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c19", "c20"],
    true
    );

var emptyTransform = new Transform("emptytransform",
    "",
    "",
    function (){
    },
    [],
    true);

module.exports = {
    eegTransform : eegTransform,
    emptyTransform : emptyTransform
};
