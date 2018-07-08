const Transform = require("../../src/index").Transform;

var idTransform = new Transform("dotsID",
    "select * from dots_100m;",
    "wenbo",
    function (row){
        var ret = [];
        for (var i = 0; i < 4; i ++)
            ret.push(row[i]);

        return Java.to(ret ,"java.lang.String[]");
    },
    ["id", "x", "y", "type"],
    true);

module.exports = {
    idTransform : idTransform
};
