// libraries
const Project = require("../../src/index").Project;
const USMap = require("../../src/template-api/USMap").USMap;

// construct project
var p = new Project("usmap", "../../../config.txt");

// specify args
var args = {
    db: "usmap",
    state: {
        table: "state",
        column: "crimerate",
        range: [0, 582],
        step: 100
    },
    county: {
        table: "county",
        column: "crimerate",
        range: [0, 1792],
        step: 250
    },
    zoomType: "jump",
    legendTitle: "Crime rate per 100,000 people",
    tooltipAlias: "Crime rate"
};

// build project
var USMapProject = new USMap(args);
p.addUSMap(USMapProject);

p.saveProject();
