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
var p = new Project("dots", "../../dbconfig.txt", 1000, 1000);

// ================== Canvas teamlogo ===================
var dotsCanvas = new Canvas("dots", 1000000, 100000);
p.addCanvas(dotsCanvas);

// add data transforms
dotsCanvas.addTransform(transforms.idTransform);

// logo layer
var dotsLayer = new Layer("dotsID", false);
dotsCanvas.addLayer(dotsLayer);
dotsLayer.addPlacement(placements.dotsPlacement);
dotsLayer.addRenderingFunc(renderers.dotsRendering);


// initialize canvas
p.initialCanvas("dots", 3000, 3000, [""]);

// save to db
p.saveToDb();
