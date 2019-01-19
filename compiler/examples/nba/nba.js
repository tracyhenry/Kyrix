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
var p = new Project("nba", "../../../config.txt", 1000, 1000);
p.addRenderingParams(renderers.renderingParams);

// ================== Canvas teamlogo ===================
var teamLogoCanvas = new Canvas("teamlogo", 1000, 1000);
p.addCanvas(teamLogoCanvas);

// logo layer
var teamLogoLayer = new Layer(transforms.teamLogoTransform, true);
teamLogoCanvas.addLayer(teamLogoLayer);
teamLogoLayer.addRenderingFunc(renderers.teamLogoRendering);

// ================== Canvas team timeline ===================
var width = 1000 * 16;
var height = 1000;

// construct a new canvas
var teamTimelineCanvas = new Canvas("teamtimeline", width, height);
p.addCanvas(teamTimelineCanvas);

// pannable timeline layer
var timelineLayer = new Layer(transforms.teamTimelineTransform, false);
teamTimelineCanvas.addLayer(timelineLayer);
timelineLayer.addPlacement(placements.teamTimelinePlacement);
timelineLayer.addRenderingFunc(renderers.teamTimelineRendering);

// static background layer
var timelineBkgLayer = new Layer(transforms.teamTimelineStaticTransform, true);
teamTimelineCanvas.addLayer(timelineBkgLayer);
timelineBkgLayer.addRenderingFunc(renderers.teamTimelineStaticBkg);

// ================== Canvas play by play ===================
var width = 1000;
var height = 0;
var wString = "";
var hString = "0:select (max(play_id) + 2) * 160 from plays;"; // todo: the "where" clause is assumed to be at the end right now

// construct a new canvas
var playByPlayCanvas = new Canvas("playbyplay", width, height, wString, hString);
p.addCanvas(playByPlayCanvas);

// pannable play by play layer
var playByPlayLayer = new Layer(transforms.playByPlayTransform, false);
playByPlayCanvas.addLayer(playByPlayLayer);
playByPlayLayer.addPlacement(placements.playByPlayPlacement);
playByPlayLayer.addRenderingFunc(renderers.playByPlayRendering);

// static background layer
var playByPlayBkgLayer = new Layer(transforms.playByPlayStaticTransform, true);
playByPlayCanvas.addLayer(playByPlayBkgLayer);
playByPlayBkgLayer.addRenderingFunc(renderers.playByPlayStaticBkg);

// ================== Canvas boxscore ===================
var width = 1750;
var height = 1000;

// construct a new canvas
var boxscoreCanvas = new Canvas("boxscore", width, height);
p.addCanvas(boxscoreCanvas);

// static pk column layer
var boxscorePkColumnLayer = new Layer(transforms.boxscoreTransform, true);
boxscoreCanvas.addLayer(boxscorePkColumnLayer);
boxscorePkColumnLayer.addRenderingFunc(renderers.boxscorePkRendering);

// pannable stats layer
var statsLayer = new Layer(transforms.boxscoreTransform, false);
boxscoreCanvas.addLayer(statsLayer);
statsLayer.addPlacement(placements.boxscorePlacement);
statsLayer.addRenderingFunc(renderers.boxscoreStatsRendering);

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

p.addJump(new Jump(teamLogoCanvas, teamTimelineCanvas, "semantic_zoom", {selector : selector,
    viewport : newViewport, predicates : newPredicate, name : jumpName}));

// ================== teamtimeline -> playbyplay ===================
var selector = function (row, layerId) {
    return (layerId == 0);
};

var newViewport = function (row) {
    return [0, 0, 0];
};

var newPredicate = function (row) {
    return ["game_id = \'" + row[0] + "\'",
            "abbr1=\'" + row[6] + "\' and abbr2=\'" + row[7] + "\'"];
};

var jumpName = function (row) {
    return "Scoring Plays of " + row[7] + "@" + row[6];
};

p.addJump(new Jump(teamTimelineCanvas, playByPlayCanvas, "semantic_zoom", {selector : selector,
    viewport : newViewport, predicates : newPredicate, name : jumpName}));

// ================== teamtimeline -> boxscore ===================
var selector = function (row, layerId) {
    return (layerId == 0);
};

var newViewport = function () {
    return [0, 0, 0]
};

var newPredicateHome = function (row) {
    return ["game_id = \'" + row[0] + "\' and team_abbreviation = \'" + row[6] + "\'",
        "game_id = \'" + row[0] + "\' and team_abbreviation = \'" + row[6] + "\'"];
};

var newPredicateAway = function (row) {
    return ["game_id = \'" + row[0] + "\' and team_abbreviation = \'" + row[7] + "\'",
        "game_id = \'" + row[0] + "\' and team_abbreviation = \'" + row[7] + "\'"];
};

var jumpNameHome = function (row) {
    return "Box score of " + row[6];
};

var jumpNameAway = function (row) {
    return "Box score of " + row[7];
};

p.addJump(new Jump(teamTimelineCanvas, boxscoreCanvas, "semantic_zoom", {selector : selector,
    viewport : newViewport, predicates : newPredicateHome, name : jumpNameHome}));
p.addJump(new Jump(teamTimelineCanvas, boxscoreCanvas, "semantic_zoom", {selector : selector,
    viewport : newViewport, predicates : newPredicateAway, name : jumpNameAway}));

// setting up initial states
p.setInitialStates(teamLogoCanvas, 0, 0, [""]);

// save to db
p.saveProject();
