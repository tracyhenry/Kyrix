const Project = require("../../src/index").Project;
const Canvas = require("../../src/Canvas").Canvas;
const Jump = require("../../src/Jump").Jump;
const Layer = require("../../src/Layer").Layer;
const View = require("../../src/View").View;
const SSV = require("../../src/template-api/SSV").SSV;

var project = new Project("fire", "../../../config.txt");

// set up ssv
var width = 960 * 2;
var height = 500 * 2;

var ssv = {
    data: {
        db: "fire",
        query:
            "SELECT x, y, fire_name, fire_year, stat_cause_descr, fire_size, latitude, longitude FROM fire;"
    },
    layout: {
        x: {
            field: "x",
            extent: [0, width]
        },
        y: {
            field: "y",
            extent: [0, height]
        },
        z: {
            field: "fire_size",
            order: "desc"
        }
    },
    marks: {
        // cluster: {
        //     mode: "pie",
        //     aggregate: {
        //         dimensions: [
        //             {
        //                 field: "stat_cause_descr",
        //                 domain: [
        //                     "Debris Burning",
        //                     "Arson",
        //                     "Lightning",
        //                     "Equipment Use",
        //                     "Miscellaneous"
        //                 ]
        //             }
        //         ],
        //         measures: [
        //             {
        //                 field: "*",
        //                 function: "count"
        //             }
        //         ]
        //     },
        //     config: {
        //         // piePadAngle: 0.05,
        //         // pieCornerRadius: 5,
        //         // pieOuterRadius: 80,
        //         // pieInnerRadius: 1
        //     }
        // },
        // hover: {
        //     rankList: {
        //         mode: "tabular",
        //         fields: [
        //             "fire_name",
        //             "fire_year",
        //             "fire_size",
        //             "stat_cause_descr"
        //         ],
        //         topk: 3
        //     },
        //     boundary: "convexhull"
        // }

        cluster: {
            mode: "custom",
            custom: require("./renderers").fireRendering,
            config: {
                clusterCount: true,
                bboxW: 120,
                bboxH: 120
            }
        },
        hover: {
            tooltip: {
                columns: [
                    "fire_name",
                    "fire_year",
                    "stat_cause_descr",
                    "fire_size",
                    "latitude",
                    "longitude"
                ],
                aliases: [
                    "Fire name",
                    "Fire year",
                    "Cause",
                    "Fire size",
                    "Latitude",
                    "Longitude"
                ]
            }
        }
    },
    config: {
        numLevels: 13,
        topLevelWidth: width,
        topLevelHeight: height
    }
};

var ret = project.addSSV(new SSV(ssv));
var pyramid = ret.pyramid;

const mapLayer = require("./MapLayer").mapLayer;

for (var i = 0; i < pyramid.length; i++) pyramid[i].addLayer(mapLayer);

project.saveProject();
