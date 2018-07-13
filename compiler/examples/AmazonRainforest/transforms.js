const Transform = require("../../src/index").Transform;

var backgroundTransform = new Transform("background",
    "select * from canvas_bg;",
    "forest",
    function (row, width, height, params){
        var id = parseInt(row[0]);
        var x = ((id-1) % params.colnumber[row[1]-1]) * params.blockwidth[row[1]-1] + params.blockwidth[row[1]-1]/2;
        var y = Math.floor((id-1) / params.colnumber[row[1]-1]) * params.blockheight[row[1]-1] + params.blockheight[row[1]-1]/2;
        var ret = [];
        ret.push(row[0]);
        ret.push(x);
        ret.push(y);
        ret.push(row[1]);
        ret.push(row[2]);
        ret.push(row[3]);

        return Java.to(ret ,"java.lang.String[]");
    },
    ["id", "x", "y", "canvas_id", "farm_id__", "url"],
    true);

module.exports = {
    backgroundTransform : backgroundTransform
};
