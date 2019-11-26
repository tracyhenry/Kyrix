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
            extent: [49964, 0]
        },
        z: {
            field: "score",
            order: "desc"
        }
    },
    marks: {
        cluster: {
            mode: "circle",
            config: {
                circleMinSize: 40,
                circleMaxSize: 80
            }
        },
        hover: {
            rankList: {
                mode: "custom",
                custom: renderer.redditHover,
                topk: 3,
                config: {
                    bboxW: 100,
                    bboxH: 30
                }
            },
            boundary: "bbox"
        }
    },
    config: {
        topLevelWidth: 1500,
        axis: true
    }
};

p.addAutoDD(new AutoDD(autoDD));
p.saveProject();
