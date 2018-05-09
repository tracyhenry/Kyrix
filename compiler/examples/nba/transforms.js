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
        ret.push(row[3]);

        return Java.to(ret ,"java.lang.String[]");
    },
    ["id", "x", "y", "team_id", "city", "name"],
    true);

var numLevels = 8;
var teamTimelineTransforms = [];
for (var i = 0; i < numLevels; i ++) {
    var curTransform = new Transform("teamtimelinescale",
        "select teamgamelogs.id, year, month, day, team1.name as home_team, team2.name as away_team, home_score, away_score, tier "
        + "from teamgamelogs, teams as team1, teams as team2 "
        + "where teamgamelogs.home_team = team1.abbr and teamgamelogs.away_team = team2.abbr;",   // and tier <= " + (i + 1),
        "nba",
        function (row, width) {

            var ret = [];
            //id
            ret.push(row[0]);
            //x
            var curDate = new Date(row[1], row[2] - 1, row[3]);
            ret.push(d3.scaleTime()
                .domain([new Date(2017, 9, 17), new Date(2018, 3, 11)])
                .range([82, width - 82])(curDate));
            //y
            var beginDate = new Date(2000, 0, 1);
            var oneDay = 24 * 60 * 60 * 1000;
            var daysPassed = Math.round(Math.abs((curDate.getTime() - beginDate.getTime())/(oneDay)));
            ret.push(daysPassed % 2 == 0 ? 495 : 725);

            //rest of the attribtues
            for (var i = 1; i <= 8; i ++)
                ret.push(row[i]);

            return Java.to(ret ,"java.lang.String[]");
        },
        ["id", "x", "y", "year", "month", "day", "home_team", "away_team", "home_score", "away_score", "tier"],
        true);
    teamTimelineTransforms.push(curTransform)
}

module.exports = {
    teamLogoTransform : teamLogoTransform,
    teamTimelineTransforms : teamTimelineTransforms
};
