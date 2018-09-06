// libraries
const index = require("../../src/index");
const Project = index.Project;
const Canvas = index.Canvas;
const Layer = index.Layer;
const Jump = index.Jump;

// project components
const renderers = require("./renderers");
const transforms = require("./transforms");
const placements = require("./placements");

// construct a project
var p = new Project("chi_task2", "../../../config.txt", 1000, 1000);
p.addRenderingParams(renderers.renderingParams);

// ================== Canvas teamlogo ===================
var teamLogoCanvas = new Canvas("teamlogo", 1000, 1000);
p.addCanvas(teamLogoCanvas);

// add data transforms
teamLogoCanvas.addTransform(transforms.teamLogoTransform);

// logo layer
var teamLogoLayer = new Layer("teamlogoID", true);
teamLogoCanvas.addLayer(teamLogoLayer);
teamLogoLayer.addRenderingFunc(renderers.teamLogoRendering);

// ================== Canvas team timeline ===================
var width = 1000 * 16;
var height = 1000;

// construct a new canvas
var teamTimelineCanvas = new Canvas("teamtimeline", width, height);
p.addCanvas(teamTimelineCanvas);

// add data transforms
teamTimelineCanvas.addTransform(transforms.teamTimelineTransform);
teamTimelineCanvas.addTransform(transforms.teamTimelineStaticTransform);

// pannable timeline layer
var timelineLayer = new Layer("teamtimelinescale", false);
teamTimelineCanvas.addLayer(timelineLayer);
timelineLayer.addPlacement(placements.teamTimelinePlacement);
timelineLayer.addRenderingFunc(renderers.teamTimelineRendering);

// static background layer
var timelineBkgLayer = new Layer("teamtimelinestatic", true);
teamTimelineCanvas.addLayer(timelineBkgLayer);
timelineBkgLayer.addRenderingFunc(renderers.teamTimelineStaticBkg);

// ================== teamlogo -> teamtimeline ===================
var selector = function (row, layerId) {
    return (layerId == 0);
};

var newViewport = function (row) {
    return [0, 0, 0]
};
var newPredicate = function (row) {
    return ["(home_team=\'" + row[6] + "\' or " + "away_team=\'" + row[6] + "\')",
            "abbr=\'" + row[6] + "\'"];
};

var jumpName = function (row) {
    return "2017~2018 Regular Season Games of\n" + row[4] + " " + row[5];
};

p.addJump(new Jump("teamlogo", "teamtimeline", selector, newViewport, newPredicate, "semantic_zoom", jumpName));

// initialize canvas
p.initialCanvas("teamlogo", 0, 0, [""]);

// save to db
p.saveProject();
