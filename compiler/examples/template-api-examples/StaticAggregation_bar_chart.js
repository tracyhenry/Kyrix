// libraries
const Project = require("../../src/index").Project;
const StaticAggregation = require("../../src/template-api/StaticAggregation")
    .StaticAggregation;

// construct project
var p = new Project("staticAggregation_bar_chart", "../../../config.txt");

// specify args
var args = {
    db: "nba",
    query: {
        table: "player_boxscore",
        dimensions: ["start_position"],
        measure: "AVG(reb)"
    },
    type: "bar",
    tooltip: {
        columns: ["start_position", "kyrixAggValue"],
        aliases: ["Starting Position", "Average Rebound per Game"]
    },
    legend: {
        title: "Average Rebounds per Game by Starting Positions",
        domain: {
            C: "Center",
            F: "Forward",
            G: "Guard"
        }
    }
};

// build project
var staticAggregation = new StaticAggregation(args);
p.addStaticAggregation(staticAggregation);

p.saveProject();
