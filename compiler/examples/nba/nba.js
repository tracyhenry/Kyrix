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

// logo layer
var teamLogoLayer = new Layer("teamlogoID", false);
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
playByPlayCanvas.addTransform(transforms.playByPlayStaticTransform);

// pannable play by play layer
var playByPlayLayer = new Layer("playbyplayscale", false);
playByPlayCanvas.addLayer(playByPlayLayer);
playByPlayLayer.addPlacement(placements.playByPlayPlacement);
playByPlayLayer.addRenderingFunc(renderers.playByPlayRendering);

// static background layer
var playByPlayBkgLayer = new Layer("playbyplaystatic", true);
playByPlayCanvas.addLayer(playByPlayBkgLayer);
playByPlayBkgLayer.addRenderingFunc(renderers.playByPlayStaticBkg);

// ================== teamlogo -> teamtimeline ===================
var newViewport = function (row) {
    return [0, 0, 0]
};
var newPredicate = function (row) {
    return ["(home_team=\"" + row[6] + "\" or " + "away_team=\"" + row[6] + "\")",
            "abbr=\"" + row[6] + "\""];
};

var jumpName = function (row) {
    return "2017~2018 Regular Season Games of\n" + row[4] + " " + row[5];
};

p.addJump(new Jump("teamlogo", "teamtimeline", 0, newViewport, newPredicate, "semantic_zoom", jumpName));

// ================== teamtimeline -> playbyplay ===================
var newViewport = function (row) {
    return [0, 0, 0]
};
var newPredicate = function (row) {
    return ["game_id = " + row[0],
            "abbr1=\"" + row[6] + "\" and abbr2=\"" + row[7] + "\""];
};

var jumpName = function (row) {
    return "Scoring Plays of " + row[7] + "@" + row[6];
};

p.addJump(new Jump("teamtimeline", "playbyplay", 0, newViewport, newPredicate, "semantic_zoom", jumpName));

// initialize canvas
p.initialCanvas("teamlogo", 0, 0, [""]);

// save to db
p.saveToDb();
