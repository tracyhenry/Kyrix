// libraries
const Project = require("../../src/index").Project;
const Canvas = require("../../src/Canvas").Canvas;
const Jump = require("../../src/Jump").Jump;
const Layer = require("../../src/Layer").Layer;
const View = require("../../src/View").View;
const Table = require("../../src/template-api/Table").Table;

var p = new Project("epl", "../../../config.txt");

var db = "nba";
var fields = [
    "id",
    "game_id",
    "year",
    "month",
    "day",
    "home_team",
    "away_team",
    "home_score",
    "away_score",
    "tier"
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
        height: 40,
        names: {
            home_team: "Home Team",
            away_team: "Away Team"
        }
    }
    // order_by: "game_id",
    // order: "desc"
};

var leagueTable = new Table(table_args);
p.addTable(leagueTable);

p.saveProject();
