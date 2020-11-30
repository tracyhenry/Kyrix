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
        table: "team_boxscore",
        dimensions: ["team_city"],
        measure: "SUM(fg3a)",
        sampleFields: ["game_id", "fgm", "fga", "fg3m", "pts"]
    },
    type: "circlePack",
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
var staticTreemapProject = new StaticHierarchy(args);
p.addStaticHierarchy(staticTreemapProject);

p.saveProject();
