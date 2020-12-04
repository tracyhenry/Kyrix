// libraries
const Project = require("../../src/index").Project;
const StaticAggregation = require("../../src/template-api/StaticAggregation")
    .StaticAggregation;

// construct project
var p = new Project("staticAggregation_treemap", "../../../config.txt");

// specify args
var args = {
    db: "nba",
    query: {
        table: "team_boxscore",
        dimensions: ["team_city"],
        measure: "SUM(fg3a)",
        sampleFields: ["game_id", "fgm", "fga", "fg3m", "pts"]
    },
    type: "treemap",
    tooltip: {
        columns: ["team_city", "kyrixAggValue"],
        aliases: ["Team", "Total 3 Pointer Attempts"]
    },
    textFields: ["team_city"],
    legend: {
        title: "Number of 3-Pointer Attempts by Team"
    }
};

// build project
var staticAggregation = new StaticAggregation(args);
p.addStaticAggregation(staticAggregation);

p.saveProject();
