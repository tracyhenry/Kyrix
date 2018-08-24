const Transform = require("../../src/index").Transform;

var flareTransform = new Transform("flareTrans",
    "select * from flare;",
    "flare",
    function (row){

        var ret = [];
        for (var i = 0; i < 5; i ++)
            ret.push(row[i]);

        return Java.to(ret ,"java.lang.String[]");
    },
    ["id", "name", "size", "parent_id", "depth"],
    true);

module.exports = {
    flareTransform : flareTransform
};
