// libraries
const Project = require("../../src/index").Project;
const StaticTemplate = require("../../src/template-api/StaticTemplate")
    .StaticTemplate;

// construct project
var p = new Project("static_circle_pack_template", "../../../config.txt");

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
var staticTemplate = new StaticTemplate(args);
p.addStaticTemplate(staticTemplate);

p.saveProject();
