// libraries
const Project = require("../../src/index").Project;
const Canvas = require("../../src/Canvas").Canvas;
const Jump = require("../../src/Jump").Jump;
const Layer = require("../../src/Layer").Layer;
const View = require("../../src/View").View;

// project components
const renderers = require("./renderers");
const transforms = require("./transforms");
const placements = require("./placements");

// construct a project
var p = new Project("nba", "../../../config.txt");
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
var playByPlayCanvas = new Canvas(
    "playbyplay",
    width,
    height,
    wString,
    hString
);
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

// ================== Views ===================
var view = new View("nba", 1000, 1000);
p.addView(view);
p.setInitialStates(view, teamLogoCanvas, 0, 0);

// ================== teamlogo -> teamtimeline ===================
var selector = function() {
    return true;
};

var newViewport = function() {
    return {constant: [0, 0]};
};

var newPredicate = function(row) {
    var pred0 = {
        OR: [{"==": ["home_team", row.abbr]}, {"==": ["away_team", row.abbr]}]
    };
    var pred1 = {"==": ["abbr", row.abbr]};
    return {layer0: pred0, layer1: pred1};
};

var jumpName = function(row) {
    return "2017~2018 Regular Season Games of\n" + row.city + " " + row.name;
};

p.addJump(
    new Jump(teamLogoCanvas, teamTimelineCanvas, "semantic_zoom", {
        selector: selector,
        viewport: newViewport,
        predicates: newPredicate,
        name: jumpName
    })
);

// ================== teamtimeline -> playbyplay ===================
var selector = function(row, args) {
    return args.layerId == 0;
};

var newViewport = function() {
    return {constant: [0, 0]};
};

var newPredicate = function(row) {
    var pred0 = {"==": ["game_id", row.game_id]};
    var pred1 = {
        AND: [
            {"==": ["abbr1", row.home_team]},
            {"==": ["abbr2", row.away_team]}
        ]
    };
    return {layer0: pred0, layer1: pred1};
};

var jumpName = function(row) {
    return "Play-by-Play of " + row.away_team + "@" + row.home_team;
};

p.addJump(
    new Jump(teamTimelineCanvas, playByPlayCanvas, "semantic_zoom", {
        selector: selector,
        viewport: newViewport,
        predicates: newPredicate,
        name: jumpName
    })
);

// ================== teamtimeline -> boxscore ===================
var selector = function(row, args) {
    return args.layerId == 0;
};

var newViewport = function() {
    return {constant: [0, 0]};
};

var newPredicateHome = function(row) {
    var pred = {
        AND: [
            {"==": ["GAME_ID", row.game_id]},
            {"==": ["TEAM_ABBR", row.home_team]}
        ]
    };
    return {layer0: pred, layer1: pred};
};

var newPredicateAway = function(row) {
    var pred = {
        AND: [
            {"==": ["GAME_ID", row.game_id]},
            {"==": ["TEAM_ABBR", row.away_team]}
        ]
    };
    return {layer0: pred, layer1: pred};
};

var jumpNameHome = function(row) {
    return "Box score of " + row.home_team;
};

var jumpNameAway = function(row) {
    return "Box score of " + row.away_team;
};

p.addJump(
    new Jump(teamTimelineCanvas, boxscoreCanvas, "semantic_zoom", {
        selector: selector,
        viewport: newViewport,
        predicates: newPredicateHome,
        name: jumpNameHome
    })
);
p.addJump(
    new Jump(teamTimelineCanvas, boxscoreCanvas, "semantic_zoom", {
        selector: selector,
        viewport: newViewport,
        predicates: newPredicateAway,
        name: jumpNameAway
    })
);

// seperate CSS file
p.addStyles("./nba.css");

// save to db
p.saveProject();
