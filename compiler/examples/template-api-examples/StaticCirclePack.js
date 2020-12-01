// libraries
const Project = require("../../src/index").Project;
const StaticHierarchy = require("../../src/template-api/StaticHierarchy")
    .StaticHierarchy;

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
var staticTreemapProject = new StaticHierarchy(args);
p.addStaticHierarchy(staticTreemapProject);

p.saveProject();
