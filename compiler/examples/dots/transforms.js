const Transform = require("../../src/index").Transform;

var dataset = {uniform:"dots", skew:"skew"}; 

var idTransform = new Transform("dotsID",
    "select * from dot;",
    dataset.skew,
    function (row){
        var ret = [], numCols = 4; 
        for (var i = 0; i < numCols; i ++)
            ret.push(row[i]);

        return Java.to(ret ,"java.lang.String[]");
    },
    ["id", "x", "y", "type"],
    true);

module.exports = {
    idTransform : idTransform
};
