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
        range: [0, 582]
        //        step: 0
        //        colorCount: 7
    },
    county: {
        table: "county",
        column: "crimerate",
        range: [0, 1792]
        //        step: 0
        //        colorCount: 7
    }
    // colorScheme: "schemeYlOrRd"
    // projection: "geoAlbersUsa"
    // stateMapWidth: 2000
    // stateMapHeight: 1000
    // zoomFactor: 6
};

// build project
var USMapProject = new USMap(args);
p.addUSMap(USMapProject);

p.saveProject();
