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

project.addRenderingParams(renderers.renderingParams);

// ================== state map canvas ===================
var stateMapCanvas = new Canvas("statemap", width, height);
project.addCanvas(stateMapCanvas);

// static legends layer
var stateMapLegendLayer = new Layer(null, true);
stateMapCanvas.addLayer(stateMapLegendLayer);
stateMapLegendLayer.addRenderingFunc(renderers.stateMapLegendRendering);

// bar chart layer
var barLayer = new Layer(transforms.barTransform, true);
stateMapCanvas.addLayer(barLayer);
barLayer.addRenderingFunc(renderers.barRendering);

// state boundary layer
var stateBoundaryLayer = new Layer(transforms.stateMapTransform, true);
stateMapCanvas.addLayer(stateBoundaryLayer);
stateBoundaryLayer.addRenderingFunc(renderers.stateMapRendering);
stateBoundaryLayer.addTooltip(
    ["state", "total_fire_size"],
    ["State", "Acres burned"]
);

var view = new View("fire", 0, 0, width, height);
project.addView(view);
project.setInitialStates(view, stateMapCanvas, 0, 0);

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
            level: 7,
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
        numLevels: 10,
        topLevelWidth: width * 4,
        topLevelHeight: height * 4
    }
};

var ret = project.addSSV(new SSV(ssv), {view: view});

// ================== state -> county ===================
var selector = function(row, args) {
    return args.layerId == 2;
};

var newPredicates = function() {
    return {};
};

var newViewport = function(row, args) {
    var zoomFactor = 4;
    var vpW = args.viewportW;
    var vpH = args.viewportH;
    var projection = d3
        .geoMercator()
        .translate([3201.4222222222224, 1479.8808343133628])
        .scale((1 << 13) / 2 / Math.PI);
    var path = d3.geoPath().projection(projection);
    var cx = path.centroid(JSON.parse(row.geomstr))[0];
    var cy = path.centroid(JSON.parse(row.geomstr))[1];

    return {
        constant: [cx * zoomFactor - vpW / 2, cy * zoomFactor - vpH / 2]
    };
};

var jumpName = function(row) {
    return "Representative wildfires in State " + row.state;
};

project.addJump(
    new Jump(stateMapCanvas, ret.pyramid[0], "geometric_semantic_zoom", {
        selector: selector,
        viewport: newViewport,
        predicates: newPredicates,
        name: jumpName
    })
);

project.saveProject();
