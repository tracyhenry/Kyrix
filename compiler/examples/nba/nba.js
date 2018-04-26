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
var p = new Project("nba", "../../dbconfig.txt", 1200, 1600);

// ================== Canvas 1 ===================
var teamLogoCanvas = new Canvas("teamlogo", 1200, 1600);
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

/*
// ================== fullname --> firstname, lastname ===================
var newViewport = function (row) {
    return [1, ["id=" + row[0]]];
};
var newPredicate = function (row) {
    return ["id=" + row[0]];
};

p.addJump(new Jump("fullname", "firstname", [newViewport, "", ""], [newPredicate, "", ""]));
p.addJump(new Jump("fullname", "lastname", ["", newViewport, ""], ["", newPredicate, ""]));*/

p.saveToDb();
