const Project = require("../../src/index").Project;
const Canvas = require("../../src/Canvas").Canvas;
const Jump = require("../../src/Jump").Jump;
const Layer = require("../../src/Layer").Layer;
const View = require("../../src/View").View;
const SSV = require("../../src/template-api/SSV").SSV;

const renderers = require("./renderers");
const transforms = require("./transforms");

var project = new Project("fire", "../../../config.txt");

// set up ssv
var width = 960 * 2;
var height = 500 * 2;

var ssv = {
    data: {
        db: "fire",
        query:
            "SELECT x, y, fire_name, fire_year, stat_cause_descr, fire_size, latitude, longitude FROM fire_small;"
    },
    layout: {
        x: {
            field: "x"
        },
        y: {
            field: "y"
        },
        z: {
            field: "fire_size",
            order: "desc"
        },
        geo: {
            level: 5,
            center: [39.5, -98.5]
        }
    },
    marks: {
        cluster: {
            mode: "custom",
            custom: renderers.fireRendering,
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

//project.addSSV(new SSV(ssv));

project.addRenderingParams(renderers.renderingParams);

// ================== state map canvas ===================
var stateMapCanvas = new Canvas("statemap", width, height);
project.addCanvas(stateMapCanvas);

// // static legends layer
// var stateMapLegendLayer = new Layer(null, true);
// stateMapCanvas.addLayer(stateMapLegendLayer);
// stateMapLegendLayer.addRenderingFunc(renderers.stateMapLegendRendering);

// state boundary layer
var stateBoundaryLayer = new Layer(transforms.stateMapTransform, true);
stateMapCanvas.addLayer(stateBoundaryLayer);
stateBoundaryLayer.addRenderingFunc(renderers.stateMapRendering);

var view = new View("fire", 0, 0, width, height);
project.addView(view);
project.setInitialStates(view, stateMapCanvas, 0, 0);

project.saveProject();
