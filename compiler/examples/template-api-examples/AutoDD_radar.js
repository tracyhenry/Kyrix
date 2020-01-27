// To run this example:
// download this csv file at: https://www.dropbox.com/s/4cdabhctkybw8tf/fifa19.csv
// then run (in root folder): ./docker-scripts/load-csv.sh fifa19.csv
// note that the name of the file has to be fifa19.csv

// libraries
const Project = require("../../src/index").Project;
const AutoDD = require("../../src/template-api/AutoDD").AutoDD;
const renderers = require("./renderers");

// construct a project
var p = new Project("fifa_autodd", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);
p.addStyles(renderers.playerRenderingStyles);

// set up auto drill down
var query = "select * from fifa19;";

var autoDD = {
    data: {
        db: "fifa19",
        query: query
    },
    layout: {
        x: {
            field: "shooting",
            extent: [0, 100]
        },
        y: {
            field: "defending",
            extent: [100, 0]
        },
        z: {
            field: "wage",
            order: "desc"
        }
    },
    marks: {
        cluster: {
            mode: "radar",
            aggregate: {
                // object notation for measures with same function & extent
                measures: {
                    fields: [
                        "defending",
                        "general",
                        "mental",
                        "passing",
                        "mobility",
                        "power",
                        "rating",
                        "shooting"
                    ],
                    function: "avg",
                    extent: [0, 100]
                }
            },
            config: {
                // radarRadius: 80
                // radarTicks: 5
            }
        },
        hover: {
            rankList: {
                mode: "custom",
                custom: renderers.playerRendering,
                topk: 3,
                orientation: "horizontal",
                config: {
                    bboxW: 180,
                    bboxH: 240
                }
            }
            //boundary: "convexhull"
        }
    },
    config: {
        topLevelWidth: 1600,
        topLevelHeight: 1000,
        axis: true
    }
};

p.addAutoDD(new AutoDD(autoDD));
p.saveProject();
