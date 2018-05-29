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
var teamTimelineCanvas = new Canvas("teamtimeline", width, height);
p.addCanvas(teamTimelineCanvas);

// add data transforms
teamTimelineCanvas.addTransform(transforms.teamTimelineTransform);

// static trim
teamTimelineCanvas.addStaticTrim(renderers.teamTimelineStaticTrim);
teamTimelineCanvas.setStaticTrimFirst(false);

// create one layer
var timelineLayer = new Layer("teamtimelinescale");
teamTimelineCanvas.addLayer(timelineLayer);
timelineLayer.addPlacement(placements.teamTimelinePlacement);
timelineLayer.addRenderingFunc(renderers.teamTimelineRendering);

// ================== Canvas play by play ===================
var width = 1000;
var height = 0;
var wString = "";
var hString = "0:select (max(play_id) + 2) * 160 from scoring_plays;"; // todo: the "where" clause is assumed to be at the end right now

// construct a new canvas
var playByPlayCanvas = new Canvas("playbyplay", width, height, wString, hString);
p.addCanvas(playByPlayCanvas);

// add data transforms
playByPlayCanvas.addTransform(transforms.playByPlayTransform);

// static trim
playByPlayCanvas.addStaticTrim(renderers.playByPlayStaticTrim);
playByPlayCanvas.setStaticTrimFirst(false);

// create one layer
var playByPlayLayer = new Layer("playbyplayscale");
playByPlayCanvas.addLayer(playByPlayLayer);
playByPlayLayer.addPlacement(placements.playByPlayPlacement);
playByPlayLayer.addRenderingFunc(renderers.playByPlayRendering);

// ================== teamlogo -> teamtimeline ===================
var newViewport = function (row) {
    return [0, 0, 0]
};
var newPredicate = function (row) {
    return ["(home_team=\"" + row[6] + "\" or " + "away_team=\"" + row[6] + "\")"];
};

var jumpName = function (row) {
    return "2017~2018 Regular Season Games of\n" + row[4] + " " + row[5];
};

var newStaticTrimArguments = function (row) {
    return [row[4] + " " + row[5], row[6]];
};

p.addJump(new Jump("teamlogo", "teamtimeline", [newViewport], [newPredicate], "semantic_zoom", jumpName, newStaticTrimArguments));

// ================== teamtimeline -> playbyplay ===================
var newViewport = function (row) {
    return [0, 0, 0]
};
var newPredicate = function (row) {
    return ["game_id = " + row[0]];
};

var jumpName = function (row) {
    return "Scoring Plays of " + row[7] + "@" + row[6];
};

var newStaticTrimArguments = function (row) {
    return [row[6], row[7]];
};

p.addJump(new Jump("teamtimeline", "playbyplay", [newViewport], [newPredicate], "semantic_zoom", jumpName, newStaticTrimArguments));


// initialize canvas
p.initialCanvas("teamlogo", 0, 0, [""]);

// save to db
p.saveToDb();
