// libraries
const Project = require("../../src/index").Project;
const StaticTreemap = require("../../src/template-api/StaticTreemap")
    .StaticTreemap;

// construct project
var p = new Project("static_treemap_template", "../../../config.txt");

// specify args
var args = {
    db: "nba",
    query: {
        table: "team_boxscore",
        dimensions: ["team_city"],
        measure: "SUM(fg3a)",
        sampleFields: ["game_id", "fgm", "fga", "fg3m", "pts"]
    },
    tooltip: {
        columns: ["team_city", "kyrixAggValue"],
        aliases: ["Team", "Total 3 Pointer Attempts"]
    },
    textField: "team_city",
    legend: {
        title: "Number of 3-Pointer Attempts by Team"
    }
};

// build project
var staticTreemapProject = new StaticTreemap(args);
p.addStaticTreemap(staticTreemapProject);

p.saveProject();
