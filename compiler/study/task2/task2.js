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
var p = new Project("task2", "../../../config.txt", 1000, 1000);
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

// **** complete the definition of pannable timeline layer


// **** complete the definition of static background layer






// **** complete the definition of the functions that customize teamlogo -> teamtimeline

/**
 * A function selecting whether a given geometry can trigger a zoom, return a boolean
 * @param row - the data row bound to the zooming geometry
 * @param layerId - id of the layer the zooming geometry belongs to
 */
var selector = function (row, layerId) {

};

/**
 * calculating a new viewport location based on the zooming geometry.
 * This function is ready, and does not need to be changed.
 */
var newViewport = function (row) {
    return [0, 0, 0];
};

/**
 * This function should return an SQL predicate for every layer on the destination canvas.
 * These predicates should select data relevant to the selected team, which would
 * require a "join" between the zooming geometry and the data transform result of the
 * destination canvas. To perform the join, attributes that can be joined are 'abbr' in
 * teamLogoTransform, 'home_team' and 'away_team' in teamTimelineTransform, and 'abbr' in
 * teamTimelineStaticTransform.
 *
 * @param row - the data row bound to the zooming geometry
 * @returns an array of strings (predicates). Size of the this array should equal to the
 * number of layers on the destination canvas.
 */
var newPredicate = function (row) {

};


/**
 * This function specifies what to show on the zoom menu.
 * In this zoom, this should show '2017~2018 Regular season games of XXX'
 * XXX is the name of the team. It's the concatenation of 'city' and 'name'
 * in teamLogoTransform.
 * @param row - the data row bound to the zooming geometry
 */
var jumpName = function (row) {

};


p.addJump(new Jump(teamLogoCanvas, teamTimelineCanvas, selector, newViewport, newPredicate, "semantic_zoom", jumpName));


// initialize canvas
p.initialCanvas(teamLogoCanvas, 0, 0, [""]);

// save to db
p.saveProject();
