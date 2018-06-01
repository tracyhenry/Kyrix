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
        ret.push((y * 2 + 1) * 80 + 100);
        ret.push(row[1]);
        ret.push(row[2]);
        ret.push(row[3]);
        ret.push(row[4]);

        return Java.to(ret ,"java.lang.String[]");
    },
    ["id", "x", "y", "team_id", "city", "name", "abbr"],
    true);

var teamTimelineTransform = new Transform("teamtimelinescale",
        "select game_id, year, month, day, team1.abbr as home_team, team2.abbr as away_team, home_score, away_score, tier "
        + "from games, teams as team1, teams as team2 "
        + "where games.home_team = team1.abbr and games.away_team = team2.abbr;",
        "nba",
        function (row, width, height, renderParams) {
            var ret = [];
            // id
            ret.push(row[0]);
            // x
            var curDate = new Date(row[1], row[2] - 1, row[3]);
            ret.push(d3.scaleTime()
                .domain([new Date(2017, 9, 17), new Date(2018, 3, 11)])
                .range([82, width - 82])(curDate));
            // y
            var beginDate = new Date(2000, 0, 1);
            var oneDay = 24 * 60 * 60 * 1000;
            var daysPassed = Math.round(Math.abs((curDate.getTime() - beginDate.getTime())/(oneDay)));
            ret.push(daysPassed % 2 == 0 ? renderParams.timelineUpperY : renderParams.timelineLowerY);

            // rest of the attributes
            for (var i = 1; i <= 8; i ++)
                ret.push(row[i]);

            return Java.to(ret ,"java.lang.String[]");
        },
        ["game_id", "x", "y", "year", "month", "day", "home_team", "away_team", "home_score", "away_score", "tier"],
        true);

var teamTimelineStaticTransform = new Transform("teamtimelinestatic",
        "select city, name, abbr from teams;",
        "nba",
        function (row) {
            var ret = [];
            for (var i = 0; i < 3; i ++)
                ret.push(row[i]);
            return Java.to(ret ,"java.lang.String[]");
        },
        ["city", "name", "abbr"],
        true);

var playByPlayTransform = new Transform("playbyplayscale",
    "select games.game_id, period, qtr_time, score, margin, home_desc, away_desc, home_team, away_team, play_id, h_player_id, a_player_id"
    + " from scoring_plays, games"
    + " where scoring_plays.game_id = games.game_id;",
    "nba",
    function (row, height) {
        var ret = [];
        // game_id
        ret.push(row[0]);

        // y
        ret.push((+row[9] + 1) * 160);

        // period & qtr_time
        ret.push(row[1]);
        ret.push(row[2]);

        // reverse score
        var scores = row[3].split("-");
        ret.push(scores[1].replace(/\s+/, "") + " - " + scores[0].replace(/\s+/, ""));

        // rest of the attributes
        for (var i = 4; i <= 8; i ++)
            ret.push(row[i]);
        ret.push(row[10]);
        ret.push(row[11]);

        return Java.to(ret ,"java.lang.String[]");
    },
    ["game_id", "y", "period", "qtr_time", "score", "margin", "home_desc", "away_desc", "home_team", "away_team", "h_player_id", "a_player_id"],
    true);

var playByPlayStaticTransform = new Transform("playbyplaystatic",
    "select team1.abbr, team2.abbr from teams as team1, teams as team2;",
    "nba",
    function (row) {
        var ret = [];
        ret.push(row[0]);
        ret.push(row[1]);
        return Java.to(ret, "java.lang.String[]");
    },
    ["abbr1", "abbr2"],
    true);

var boxscoreTransform = new Transform("boxscoreall",
    "select * from player_boxscore",
    "nba",
    function (row) {
        var ret = [];
        for (var i = 0; i < row.length; i ++)
            ret.push(row[i]);
        return Java.to(ret ,"java.lang.String[]");
    },
    ['id', 'GAME_ID', 'TEAM_ID', 'TEAM_ABBREVIATION', 'TEAM_CITY', 'PLAYER_ID', 'PLAYER_NAME', 'START_POSITION', 'MIN', 'PTS', 'FGM', 'FGA', 'FG_PCT', 'FG3M', 'FG3A', 'FG3_PCT', 'FTM', 'FTA', 'FT_PCT', 'OREB', 'DREB', 'REB', 'AST', 'STL', 'BLK', 'TUNROVER', 'PF', 'PLUS_MINUS'],
    true);

module.exports = {
    teamLogoTransform : teamLogoTransform,
    teamTimelineTransform : teamTimelineTransform,
    teamTimelineStaticTransform : teamTimelineStaticTransform,
    playByPlayTransform : playByPlayTransform,
    playByPlayStaticTransform : playByPlayStaticTransform,
    boxscoreTransform : boxscoreTransform
};
