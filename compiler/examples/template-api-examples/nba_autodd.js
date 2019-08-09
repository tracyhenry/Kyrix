// libraries
const Project = require("../../src/index").Project;
const AutoDD = require("../../src/template-api/AutoDD").AutoDD;
const renderers = require("../nba/renderers");

// construct a project
var p = new Project("nba_autodd", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);
p.addStyles("../nba/nba.css");

// set up auto drill down
var query =
    "select game_id, year, month, day, team1.abbr as home_team, team2.abbr as away_team, home_score, away_score, team1.rank + team2.rank as agg_rank " +
    "from games, teams as team1, teams as team2 " +
    "where games.home_team = team1.abbr and games.away_team = team2.abbr " +
    "order by agg_rank;";

var autoDD = {
    data: {
        db: "nba",
        query: query
    },
    x: {
        col: "home_score",
        range: [69, 149]
    },
    y: {
        col: "away_score",
        range: [69, 148]
    },
    rendering: {
        mode: "contour+object",
        roughN: 999,
        axis: true,
        contourColorScheme: "interpolateBlues",
        obj: {
            renderer: renderers.teamTimelineRendering,
            bboxW: 162,
            bboxH: 132
        }
    }
};

p.addAutoDD(new AutoDD(autoDD), {newPyramid: true, newView: true});

p.saveProject();
