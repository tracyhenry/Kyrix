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
    column: "dem_voteshare",
    range: [0, 100],
    step: 20,
  },
  county: {
    table: "county",
    column: "dem_voteshare",
    range: [0, 100],
    step: 20,
  },
  colorScheme: "schemeRdBu",
  zoomType: "jump",
  legendTitle: "Percent Democrat Votes",
  tooltipAlias: "Percent Democrat",
};

// build project
var USMapProject = new USMap(args);
p.addUSMap(USMapProject);

p.saveProject();
