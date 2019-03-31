// libraries
const Project = require("../../src/index").Project;
const AutoDD = require("../../src/AutoDD").AutoDD;
const renderers = require("../nba/renderers");

// construct a project
var p = new Project("autodd_test", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);

// set up auto drill down
var query = "select game_id, year, month, day, team1.abbr as home_team, team2.abbr as away_team, home_score, away_score "
    + "from games, teams as team1, teams as team2 "
    + "where games.home_team = team1.abbr and games.away_team = team2.abbr;";

p.addAutoDD(new AutoDD(query, "nba", "home_score", "away_score", 160, 130, {rendering : renderers.teamTimelineRendering}), true);

p.saveProject();
