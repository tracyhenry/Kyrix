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

// initialize canvas
p.initialCanvas("teamlogo", 0, 0, [""]);

// ================== Canvas team timeline ===================
var numLevels = 8;
var zoomFactor = 2;

for (var i = 0; i < numLevels; i ++) {
    var width = 1000 * Math.pow(zoomFactor, i);
    var height = 1000;

    // construct a new canvas
    var curCanvas = new Canvas("teamtimeline_level" + i, width, height);
    p.addCanvas(curCanvas);

    // add data transforms
    curCanvas.addTransform(transforms.teamTimelineTransforms[i]);

    // static trim
    curCanvas.addStaticTrim(renderers.teamTimelineStaticTrim);
    curCanvas.setStaticTrimFirst(false);

    // create one layer
    var curLayer = new Layer("teamtimelinescale");
    curCanvas.addLayer(curLayer);
    curLayer.addPlacement(placements.teamTimelinePlacement);
    curLayer.addRenderingFunc(renderers.teamTimelineRendering);
}

// add literal zooms
for (var i = 0; i + 1 < numLevels; i ++) {
//    p.addJump(new Jump("teamtimeline_level" + i, "teamtimeline_level" + (i + 1), [""], [""], "literal_zoom_in"));
//    p.addJump(new Jump("teamtimeline_level" + (i + 1), "teamtimeline_level" + i, [""], [""], "literal_zoom_out"));
}

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

p.addJump(new Jump("teamlogo", "teamtimeline_level4", [newViewport], [newPredicate], "semantic_zoom", jumpName, newStaticTrimArguments));

p.saveToDb();
