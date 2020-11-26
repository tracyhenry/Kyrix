// libraries
const Project = require("../../src/index").Project;
const Pie = require("../../src/template-api/Pie").Pie;

// construct project
var p = new Project("pie_template", "../../../config.txt");

// specify args
var args = {
    db: "nba",
    query: {
        table: "player_boxscore",
        dimensions: ["start_position"],
        measure: "AVG(reb)",
        sampleFields: ["game_id", "team_city", "player_name"]
    },
    tooltip: {
        columns: ["start_position", "kyrixAggValue"],
        aliases: ["Starting Position", "Average Rebound per Game"]
    },
    legend: {
        title: "Average Rebounds per Game by Starting Positions",
        domain: {
            "": "Bench",
            C: "Center",
            F: "Forward",
            G: "Guard"
        }
    },
    colorScheme: "schemePastel1"
};

// build project
var pieProject = new Pie(args);
p.addPie(pieProject);

p.saveProject();
