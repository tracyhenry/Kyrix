// libraries
const Project = require("../../src/index").Project;
const AutoDD = require("../../src/template-api/AutoDD").AutoDD;

// construct a project
var p = new Project("autodd_citus", "../../../config.txt");

// set up auto drill down
// note -- for Citus, this query must be SELECT * FROM tbl
var query = "SELECT * from dots;";

var autoDD = {
    data: {
        db: "kyrix",
        query: query
    },
    layout: {
        x: {
            field: "x",
            extent: [0, 1000000]
        },
        y: {
            field: "y",
            extent: [0, 1000000]
        },
        z: {
            field: "z",
            order: "asc"
        }
    },
    marks: {
        cluster: {
            mode: "circle",
            config: {
                // circleMinSize: 30,
                // circleMaxSize: 70
            }
        }
    },
    config: {
        numLevels: 8,
        axis: true,
        topLevelWidth: 1500
    }
};

p.addAutoDD(new AutoDD(autoDD));
p.saveProject();
