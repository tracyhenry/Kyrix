// To run this example:
// download this csv file at: https://www.dropbox.com/s/sd5vx2rkdsqcwtv/fifa20.csv
// then run (in root folder): ./docker-scripts/load-csv.sh fifa20.csv
// note that the name of the file has to be fifa20.csv

// libraries
const Project = require("../../src/index").Project;
const SSV = require("../../src/template-api/SSV").SSV;
const renderers = require("./renderers");

// construct a project
var p = new Project("ssv_dot", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);

// set up ssv
var query = "select * from fifa20;";

var ssv = {
    data: {
        db: "fifa20",
        query: query
    },
    layout: {
        x: {
            field: "rating",
            extent: [40, 100]
        },
        y: {
            field: "wage",
            extent: [600, 0]
        },
        z: {
            field: "power",
            order: "desc"
        }
    },
    marks: {
        cluster: {
            mode: "dot",
            config: {
                dotSizeColumn: "defending",
                dotSizeDomain: [0, 100],
                dotSizeLegendTitle: "Defensive Rating",
                dotColorColumn: "agegroup",
                dotColorDomain: ["U29", "U23", "U20", "Older"],
                dotColorLegendTitle: "Age Group"
            }
        },
        hover: {
            tooltip: {
                columns: [
                    "name",
                    "rating",
                    "wage",
                    "power",
                    "defending",
                    "position"
                ],
                aliases: [
                    "Player Name",
                    "Overall Rating",
                    "Wage",
                    "Power",
                    "Defense",
                    "Position"
                ]
            }
        }
    },
    config: {
        topLevelWidth: 1500,
        topLevelHeight: 1000,
        axis: true
    }
};

p.addSSV(new SSV(ssv));
p.saveProject();
