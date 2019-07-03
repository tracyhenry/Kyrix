// libraries
const Project = require("../../src/index").Project;
const AutoDD = require("../../src/AutoDD").AutoDD;
const renderers = require("../nba/renderers");

// construct a project
var p = new Project("nba_autodd", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);

// set up auto drill down
var query =
    "select game_id, year, month, day, team1.abbr as home_team, team2.abbr as away_team, home_score, away_score, team1.rank + team2.rank as agg_rank " +
    "from games, teams as team1, teams as team2 " +
    "where games.home_team = team1.abbr and games.away_team = team2.abbr " +
    "order by agg_rank;";

var args = {
    query: query,
    db: "nba",
    xCol: "home_score",
    yCol: "away_score",
    loX: 69,
    hiX: 149,
    loY: 69,
    hiY: 148,
    bboxW: 162,
    bboxH: 132,
    axis: true,
    numLevels: 9,
    roughN: 999,
    renderingMode: "object+clusternum",
    rendering: renderers.teamTimelineRendering
};

p.addAutoDD(new AutoDD(args));

p.saveProject();
