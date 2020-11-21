/**
 * Compared to the example in USMap/USMap.js, this example has more customization.
 */
// libraries
const Project = require("../../src/index").Project;
const USMap = require("../../src/template-api/USMap").USMap;

// construct project
var p = new Project("usmap_template", "../../../config.txt");

// specify args
var args = {
    db: "usmap",
    state: {
        table: "state",
        column: "crimerate",
        range: [0, 582],
        step: 100,
        colorCount: 6
    },
    county: {
        table: "county",
        column: "crimerate",
        range: [0, 1792],
        step: 300,
        colorCount: 7
    },
    legendTitle: "Crime rate per 100,000 people",
    tooltipAlias: "Crime rate",
    zoomType: "literal",
    colorScheme: "schemeBlues",
    projection: "geoMercator",
    stateMapWidth: 1500,
    stateMapHeight: 750,
    zoomFactor: 4
};

// build project
var USMapProject = new USMap(args);
p.addUSMap(USMapProject);

p.saveProject();
