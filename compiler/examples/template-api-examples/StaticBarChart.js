// libraries
const Project = require("../../src/index").Project;
const StaticTemplate = require("../../src/template-api/StaticTemplate")
    .StaticTemplate;

// construct project
var p = new Project("bar_template", "../../../config.txt");

// specify args
var args = {
    db: "nba",
    query: {
        table: "player_boxscore",
        dimensions: ["start_position"],
        measure: "AVG(reb)",
        sampleFields: ["game_id", "team_city", "player_name"]
    },
    type: "bar",
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
var staticTemplate = new StaticTemplate(args);
p.addStaticTemplate(staticTemplate);

p.saveProject();
