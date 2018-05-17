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
var p = new Project("nba", "../../dbconfig.txt", 1000, 1000);

// ================== Canvas teamlogo ===================
var teamLogoCanvas = new Canvas("teamlogo", 1000, 1000);
p.addCanvas(teamLogoCanvas);

// add data transforms
teamLogoCanvas.addTransform(transforms.teamLogoTransform);

// only one layer
var teamLogoLayer = new Layer("teamlogoID");
teamLogoCanvas.addLayer(teamLogoLayer);
teamLogoLayer.addPlacement(placements.teamLogoPlacement);
teamLogoLayer.addRenderingFunc(renderers.teamLogoRendering);

// ================== Canvas team timeline ===================
var width = 1000 * 16;
var height = 1000;

// construct a new canvas
var curCanvas = new Canvas("teamtimeline", width, height);
p.addCanvas(curCanvas);

// add data transforms
curCanvas.addTransform(transforms.teamTimelineTransform);

// static trim
curCanvas.addStaticTrim(renderers.teamTimelineStaticTrim);
curCanvas.setStaticTrimFirst(false);

// create one layer
var curLayer = new Layer("teamtimelinescale");
curCanvas.addLayer(curLayer);
curLayer.addPlacement(placements.teamTimelinePlacement);
curLayer.addRenderingFunc(renderers.teamTimelineRendering);


// ================== teamlogo -> teamtimeline_level0 ===================
var newViewport = function (row) {
    return [0, 0, 0]
};
var newPredicate = function (row) {
    return ["(home_team=\"" + row[5] + "\" or " + "away_team=\"" + row[5] + "\")"];
};

var jumpName = function (row) {
    return "2017~2018 Regular Season Games of\n" + row[4] + " " + row[5];
};

var newStaticTrimArguments = function (row) {
    return [row[4] + " " + row[5]];
};

p.addJump(new Jump("teamlogo", "teamtimeline", [newViewport], [newPredicate], "semantic_zoom", jumpName, newStaticTrimArguments));


// initialize canvas
p.initialCanvas("teamlogo", 0, 0, [""]);

// save to db
p.saveToDb();
