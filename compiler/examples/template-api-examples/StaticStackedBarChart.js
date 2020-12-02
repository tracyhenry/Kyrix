// libraries
const Project = require("../../src/index").Project;
const StaticTemplate = require("../../src/template-api/StaticTemplate")
    .StaticTemplate;

// construct project
var p = new Project("bar_template", "../../../config.txt");

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
var staticTemplate = new StaticTemplate(args);
p.addStaticTemplate(staticTemplate);

p.saveProject();
