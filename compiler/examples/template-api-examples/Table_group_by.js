// libraries
const Project = require("../../src/index").Project;
const Table = require("../../src/template-api/Table").Table;

var p = new Project("table_nba_game", "../../../config.txt");

var db = "nba";
var fields = [
    "play_id",
    "game_id",
    "period",
    "qtr_time",
    "score",
    "margin",
    "home_desc",
    "away_desc"
];
var table = "plays";

var table_args = {
    table: table,
    fields: fields,
    db: db,
    width: {
        home_desc: 500,
        away_desc: 500
    },
    // heads: "auto",
    // heads: "none",
    heads: {
        height: 70,
        names: {
            home_desc: "Home Play Description",
            away_desc: "Away Play Description"
        }
    },

    group_by: "game_id",
    order_by: "play_id",
    order: "asc"
};

var leagueTable = new Table(table_args);
var tableobj = p.addTable(leagueTable);

p.setInitialStates(tableobj.view, tableobj.canvas, 0, 0, {
    layer0: {"==": ["game_id", "0021701083"]}
});

p.saveProject();
