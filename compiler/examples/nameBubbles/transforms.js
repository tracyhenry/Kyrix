const Transform = require("../../src/index").Transform;

// scale x and y from the pi table
var c1ScalexyPi = new Transform("scalexy_pi",
    "select * from pi;",
    "wenbo",
    function (row) {
        var ret = [];
        ret.push(row[0]);
        ret.push(row[1]);
        ret.push(row[2]);
        ret.push(d3.scaleLinear().domain([0, 5000000]).range([0, 5000])(row[3]));
        ret.push(d3.scaleLinear().domain([0, 5000000]).range([0, 5000])(row[4]));
        return Java.to(ret ,"java.lang.String[]");
    },
    ["id", "firstname", "lastname", "x", "y"],
    true
);

// scale x and y from the stu table;
var c1ScalexyStu = new Transform("scalexy_stu",
    "select * from stu;",
    "wenbo",
    function (row) {
        var ret = [];
        ret.push(row[0]);
        ret.push(row[1]);
        ret.push(row[2]);
        ret.push(d3.scaleLinear().domain([0, 5000000]).range([0, 5000])(row[3]));
        ret.push(d3.scaleLinear().domain([0, 5000000]).range([0, 5000])(row[4]));
        return Java.to(ret ,"java.lang.String[]");
    },
    ["id", "firstname", "lastname", "x", "y"],
    true
);

// empty transform
var c1Empty = new Transform("empty",
    "",
    "",
    function (row) {}, [], true);

// canvas 2 identity transform
var c2IDTransform = new Transform("identical",
    "select * from pi;",
    "wenbo",
    function (row) {
        var ret = [];
        for (var i = 0; i < 5; i ++)
            ret.push(row[i]);
        return Java.to(ret ,"java.lang.String[]");
    },
    ["id", "firstname", "lastname", "x", "y"],
    true
);

// canvas 3 identity transform
var c3IDTransform = new Transform("identical",
    "select * from stu;",
    "wenbo",
    function (row) {
        var ret = [];
        for (var i = 0; i < 5; i ++)
            ret.push(row[i]);
        return Java.to(ret ,"java.lang.String[]");
    },
    ["id", "firstname", "lastname", "x", "y"],
    true
);

module.exports = {
    c1ScalexyPi : c1ScalexyPi,
    c1ScalexyStu : c1ScalexyStu,
    c1Empty : c1Empty,
    c2IDTransform : c2IDTransform,
    c3IDTransform : c3IDTransform
};
