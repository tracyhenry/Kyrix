// libraries
const Project = require("../../src/index").Project;
const StaticAggregation = require("../../src/template-api/StaticAggregation")
    .StaticAggregation;

// construct project
var p = new Project("staticAggregation_stacked_bar_chart", "../../../config.txt");

// specify args
var args = {
    db: "nba",
    query: {
        table: "player_boxscore",
        dimensions: ["division"],
        stackDimensions: ["start_position"],
        measure: "AVG(fg3m)"
    },
    type: "bar",
    tooltip: {
        columns: ["division", "start_position", "kyrixAggValue"],
        aliases: ["Team Division", "Starting Position", "Average 3PM per Game"]
    },
    legend: {
        title:
            "Average 3 Pointers Made per Game by Division and Starting Position",
        domain: {
            C: "Center",
            F: "Forward",
            G: "Guard"
        }
    },
    axis: {
        xTitle: "Team Division",
        yTitle: "Average 3PM per Game"
    }
};

// build project
var staticAggregation = new StaticAggregation(args);
p.addStaticAggregation(staticAggregation);

p.saveProject();
