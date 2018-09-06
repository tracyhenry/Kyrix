const Transform = require("../../src/index").Transform;

var dbName = "wenbo";

// scale x and y from the pi table
var fullNameCircleTransform = new Transform("scalexy_pi",
    "select * from pi;",
    dbName,
    function (row, width, height) {
        var ret = [];
        ret.push(row[0]);
        ret.push(row[1]);
        ret.push(row[2]);
        ret.push(d3.scaleLinear().domain([0, 5000000]).range([0, width])(row[3]));
        ret.push(d3.scaleLinear().domain([0, 5000000]).range([0, height])(row[4]));

        return Java.to(ret ,"java.lang.String[]");
    },
    ["id", "firstname", "lastname", "x", "y"],
    true
);

// scale x and y from the stu table;
var fullNameRectangleTransform = new Transform("scalexy_stu",
    "select * from stu;",
    dbName,
    function (row, width, height) {
        var ret = [];
        ret.push(row[0]);
        ret.push(row[1]);
        ret.push(row[2]);
        ret.push(d3.scaleLinear().domain([0, 5000000]).range([0, width])(row[3]));
        ret.push(d3.scaleLinear().domain([0, 5000000]).range([0, height])(row[4]));
        return Java.to(ret ,"java.lang.String[]");
    },
    ["id", "firstname", "lastname", "x", "y"],
    true
);

// empty transform
var emptyTransform = new Transform("empty",
    "",
    "",
    function (row) {}, [], true);

// first name identity transform
var firstNameTransform = new Transform("identical",
    "select * from pi;",
    dbName,
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
var lastNameTransform = new Transform("identical",
    "select * from stu;",
    dbName,
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
    fullNameCircleTransform : fullNameCircleTransform,
    fullNameRectangleTransform : fullNameRectangleTransform,
    emptyTransform : emptyTransform,
    firstNameTransform : firstNameTransform,
    lastNameTransform : lastNameTransform
};
