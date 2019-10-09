// THIS NEW SYNTAX HAS NOT BEEN THOROUGHLY TESTED NOR INTEGRATED
const Transform = require("../../src/Transform").Transform;

var teamLogoTransform = new Transform(
    "select * from teams;",
    "kyrix",
    function(obj, cw, ch, params) {
        var y = Math.floor(obj.id / 6);
        var x = obj.id - y * 6;
        obj.x = (x * 2 + 1) * 80;
        obj.y = (y * 2 + 1) * 80 + 100;
        return obj;
    },
    ["id", "x", "y", "team_id", "city", "name", "abbr"],
    true
);

var teamTimelineTransform = new Transform(
    "select game_id, year, month, day, home_team, away_team, home_score, away_score, 1 from games;",
    "kyrix",
    function(obj, cw, ch, params) {
        if (!("d3" in plv8)) {
            plv8.d3 = require("d3");
        }
        var d3 = plv8.d3;
        // x
        var curDate = new Date(obj.year, obj.month - 1, obj.day);
        obj.x = d3
            .scaleTime()
            .domain([new Date(2017, 9, 17), new Date(2018, 3, 11)])
            .range([82, cw - 82])(curDate);
        // y
        var beginDate = new Date(2000, 0, 1);
        var oneDay = 24 * 60 * 60 * 1000;
        var daysPassed = Math.round(
            Math.abs((curDate.getTime() - beginDate.getTime()) / oneDay)
        );
        obj.y =
            daysPassed % 2 == 0 ? params.timelineUpperY : params.timelineLowerY;
        return obj;
    },
    [
        "game_id",
        "x",
        "y",
        "year",
        "month",
        "day",
        "home_team",
        "away_team",
        "home_score",
        "away_score",
        "timeline"
    ],
    true
);

var teamTimelineStaticTransform = new Transform(
    "select city, name, abbr from teams;",
    "kyrix",
    "",
    [],
    true
);

var playByPlayTransform = new Transform(
    "select games.game_id, period, qtr_time, score, margin, home_desc, away_desc, home_team, away_team, play_id, h_player_id, a_player_id" +
        " from plays, games" +
        " where plays.game_id = games.game_id;",
    "kyrix",
    function(obj, cw, ch, params) {
        // y
        obj.y = (obj.play_id + 1) * 160;

        // reverse score
        if (obj.score == "None") obj.score = "";
        else {
            var scores = obj.score.split("-");
            obj.score =
                scores[1].replace(/\s+/, "") +
                " - " +
                scores[0].replace(/\s+/, "");
        }
        return obj;
    },
    [
        "game_id",
        "y",
        "period",
        "qtr_time",
        "score",
        "margin",
        "home_desc",
        "away_desc",
        "home_team",
        "away_team",
        "h_player_id",
        "a_player_id"
    ],
    true
);

var playByPlayStaticTransform = new Transform(
    "select team1.abbr as abbr1, team2.abbr as abbr2 from teams as team1, teams as team2;",
    "kyrix",
    "",
    [],
    true
);

var boxscoreTransform = new Transform(
    "select * from player_boxscore;",
    "kyrix",
    "",
    [],
    true
);

module.exports = {
    teamLogoTransform,
    teamTimelineTransform,
    teamTimelineStaticTransform,
    playByPlayTransform,
    playByPlayStaticTransform,
    boxscoreTransform
};
