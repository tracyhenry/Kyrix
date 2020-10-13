// libraries
const Project = require("../../src/index").Project;
const USMap = require("../../src/template-api/USMap").USMap;

// construct project
var p = new Project("usmap_", "../../../config.txt");

// specify args
var args = {
    db: "usmap",
    state: {
        table: "stateRate",
        column: "rate",
        range: [0, 100]
        // colorScheme: "schemeBlues"
        // colorCount: 7
        //
    },
    county: {
        table: "countyRate",
        column: "rate"
    }
    // projection: "geoAlbersUsa"
    // stateMapWidth: 2000
    // stateMapHeight: 1000
    // zoomFactor: 6
};

// build project
var USMapProject = new USMap(args);
p.addUSMap(USMapProject);

p.saveProject();
