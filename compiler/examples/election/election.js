// libraries
const Project = require("../../src/index").Project;
const USMap = require("../../src/template-api/USMap").USMap;

// construct project
var p = new Project("election", "../../../config.txt");

// specify args
var args = {
    db: "election",
    state: {
        table: "state",
        column: "rate",
        range: [0, 100],
        step: 10
    },
    county: {
        table: "county",
        column: "rate",
        range: [0, 100],
        step: 10
    },
    colorScheme: "schemeRdBu",
    zoomType: "jump",
    legendTitle: "Percent Democrat Votes",
    tooltipAlias: "Percent Democrat",
    updatesEnabled: true
};

// build project
var USMapProject = new USMap(args);
p.addUSMap(USMapProject);

p.saveProject();
