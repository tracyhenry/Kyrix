// libraries
const Project = require("../../src/index").Project;
const StaticAggregation = require("../../src/template-api/StaticAggregation")
    .StaticAggregation;

// construct project
var p = new Project("staticAggregation_circle_pack", "../../../config.txt");

// specify args
var args = {
    db: "nba",
    query: {
        table: "games",
        dimensions: ["month"],
        measure: "COUNT(*)"
    },
    type: "circlePack",
    tooltip: {
        columns: ["month", "kyrixAggValue"],
        aliases: ["Month", "Total Games Played"]
    },
    colorScheme: "interpolateYlGn",
    textFields: ["month"],
    legend: {
        title: "Total Games Played by Month"
    }
};

// build project
var staticAggregation = new StaticAggregation(args);
p.addStaticAggregation(staticAggregation);

p.saveProject();
