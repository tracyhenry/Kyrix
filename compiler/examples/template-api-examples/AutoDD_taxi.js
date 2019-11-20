// libraries
const Project = require("../../src/index").Project;
const AutoDD = require("../../src/template-api/AutoDD").AutoDD;

// construct a project
var p = new Project("taxi_autodd", "../../../config.txt");

// set up auto drill down
var query = "select * from trips;";

var autoDD = {
    data: {
        db: "kyrix",
        query: query
    },
    layout: {
        x: {
            field: "seconds",
            extent: [0, 10000]
        },
        y: {
            field: "total",
            extent: [1000, 0]
        },
        z: {
            field: "none",
            order: "none"
        }
    },
    marks: {
        cluster: {
            mode: "heatmap",
            config: {
                heatmapRadius: 75
                // heatmapOpacity: 0.5,
            }
        }
    },
    config: {
        topLevelWidth: 1280,
        topLevelHeight: 720,
        axis: true
    }
};

p.addAutoDD(new AutoDD(autoDD));
p.saveProject();
