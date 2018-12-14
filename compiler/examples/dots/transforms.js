const Transform = require("../../src/index").Transform;

var tableName = "dots_100m"; 
var sqlQuery = "select * from " + tableName + ";";
var dbName = "wenbo"; 
var idTransform = new Transform("dotsID",
    sqlQuery,
    dbName,
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
