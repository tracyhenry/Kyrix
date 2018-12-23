const Transform = require("../../src/index").Transform;

// scale x and y from the pi table
var c1ScalexyPi = new Transform("select * from pi;",
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
var c1ScalexyStu = new Transform("select * from stu;",
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

// canvas 2 identity transform
var c2IDTransform = new Transform("select * from pi;",
    "wenbo",
    "",
    ["id", "firstname", "lastname", "x", "y"],
    true
);

// canvas 3 identity transform
var c3IDTransform = new Transform("select * from stu;",
    "wenbo",
    "",
    ["id", "firstname", "lastname", "x", "y"],
    true
);

module.exports = {
    c1ScalexyPi : c1ScalexyPi,
    c1ScalexyStu : c1ScalexyStu,
    c2IDTransform : c2IDTransform,
    c3IDTransform : c3IDTransform
};
