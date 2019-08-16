// libraries
const Project = require("../../src/index").Project;
const Table = require("../../src/template-api/Table").Table;

var p = new Project("table_nba_game", "../../../config.txt");

var db = "nba";
var fields = [
    "year",
    "month",
    "day",
    "home_team",
    "home_score",
    "away_score",
    "away_team"
];
var table = "games";

var table_args = {
    table: table,
    fields: fields,
    db: db,
    width: {
        home_team: 150,
        away_team: 150
    },
    // heads: "auto",
    heads: {
        height: 70,
        names: {
            home_team: "Home Team",
            away_team: "Away Team",
            home_score: "Home Score",
            away_score: "Away Score"
        }
    },
    name: "backend",

    group_by: "home_team",

    order_by: "game_id",
    order: "asc"
};

var leagueTable = new Table(table_args);
var tableobj = p.addTable(leagueTable);

p.setInitialStates(tableobj.view, tableobj.canvas, 0, 0, {
    layer0: {"==": ["home_team", "HOU"]}
});

p.saveProject();
