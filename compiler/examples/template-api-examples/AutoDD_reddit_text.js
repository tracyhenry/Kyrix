// libraries
const Project = require("../../src/index").Project;
const AutoDD = require("../../src/template-api/AutoDD").AutoDD;
const renderer = require("./renderers");

// construct a project
var p = new Project("reddit_autodd", "../../../config.txt");

// set up auto drill down
var autoDD = {
    data: {
        db: "kyrix",
        query: "SELECT * FROM comments;"
    },
    layout: {
        x: {
            field: "created_utc",
            extent: [1356998400, 1425167999]
        },
        y: {
            field: "body_len",
            extent: [10000, 0]
        },
        z: {
            field: "score",
            order: "desc"
        }
    },
    marks: {
        cluster: {
            mode: "custom",
            custom: renderer.redditTextRendering,
            config: {
                clusterCount: true,
                bboxW: 300,
                bboxH: 65
            }
        }
    },
    config: {
        topLevelWidth: 1800,
        numLevels: 20,
        axis: true
    }
};

p.addAutoDD(new AutoDD(autoDD));
p.saveProject();
