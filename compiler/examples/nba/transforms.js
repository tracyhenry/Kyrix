const Transform = require("../../src/index").Transform;

var teamLogoTransform = new Transform("teamlogoID",
    "select * from teams;",
    "nba",
    function (row){
        var id = parseInt(row[0]);
        var y = Math.floor(id / 6);
        var x = id - y * 6;
        var ret = [];
        ret.push(row[0]);
        ret.push((x * 2 + 1) * 80);
        ret.push((y * 2 + 1) * 80);
        ret.push(row[1]);
        ret.push(row[2]);
        ret.push(row[3].toLowerCase());

        return Java.to(ret ,"java.lang.String[]");
        },
    ["id", "x", "y", "team_id", "city", "name"],
    true);

module.exports = {
    teamLogoTransform : teamLogoTransform
};
