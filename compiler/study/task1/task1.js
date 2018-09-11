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
var p = new Project("task1", "../../../config.txt", 1000, 1000);

// **** construct canvases, possibly by modifying the code of the warm up exercise
var topCanvas, bottomCanvas;




// **** add geometric zooms, when specifying the jump object
// **** leave everything an empty string except canvas objects and zoom type
// **** you need to specify two jump objects, one with type literal_zoom_in
// **** the other with type literal_zoom_out






// initialize canvas
p.initialCanvas(topCanvas, 1000, 1000, ["", ""]);

// this line should be at the very end of this file
p.saveProject();
