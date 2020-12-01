// libraries
const Project = require("../../src/index").Project;
const StaticTemplate = require("../../src/template-api/StaticTemplate")
    .staticTemplate;

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
var staticTemplate = new StaticTemplate(args);
p.addStaticTemplate(staticTemplate);

p.saveProject();
