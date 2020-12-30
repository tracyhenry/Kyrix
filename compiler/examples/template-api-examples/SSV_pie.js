// To run this example:
// download this csv file at: https://www.dropbox.com/s/sd5vx2rkdsqcwtv/fifa20.csv
// then run (in root folder): ./docker-scripts/load-csv.sh fifa20.csv
// note that the name of the file has to be fifa20.csv

// libraries
const Project = require("../../src/index").Project;
const SSV = require("../../src/template-api/SSV").SSV;
const renderers = require("./renderers");

// construct a project
var p = new Project("ssv_pie", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);
p.addStyles(renderers.playerRenderingStyles);

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
            field: "wage",
            order: "desc"
        }
    },
    marks: {
        cluster: {
            mode: "pie",
            aggregate: {
                dimensions: [
                    {
                        field: "agegroup",
                        domain: ["U20", "U23", "U29", "Older"]
                    }
                ],
                measures: [
                    {
                        field: "*",
                        function: "count"
                    }
                ]
            },
            config: {
                // piePadAngle: 0.05,
                // pieCornerRadius: 5,
                // pieOuterRadius: 80,
                // pieInnerRadius: 1
                pieLegendTitle: "Age Groups of Soccer Players in FIFA 2020",
                pieLegendDomain: ["Under 20", "Under 23", "Under 29", "Older"]
            }
        },
        hover: {
            rankList: {
                mode: "tabular",
                fields: ["name", "nationality", "rating", "wage"],
                topk: 3
            },
            boundary: "convexhull"
        }
    },
    config: {
        topLevelWidth: 1500,
        topLevelHeight: 1000,
        axis: true,
        numberFormat: ".2~s"
    }
};

p.addSSV(new SSV(ssv));
p.saveProject();
