// libraries
const Project = require("../../src/index").Project;
const StaticAggregation = require("../../src/template-api/StaticAggregation")
    .StaticAggregation;

// construct project
var p = new Project("staticAggregation_wordcloud", "../../../config.txt");

// specify args
var args = {
    db: "nba",
    query: {
        table: "team_boxscore",
        dimensions: ["team_city"],
        measure: "SUM(fg3a)",
        sampleFields: ["game_id", "fgm", "fga", "fg3m", "pts"]
    },
    type: "wordCloud",
    tooltip: {
        columns: ["team_city", "kyrixAggValue"],
        aliases: ["Team", "Total 3 Pointer Attempts"]
    },
    padding: 30,
    textFields: ["team_city"],
    cloud: {
        maxTextSize: 100
        // rotation: [0, 90]
    }
};

// build project
var staticAggregation = new StaticAggregation(args);
p.addStaticAggregation(staticAggregation);

p.saveProject();
