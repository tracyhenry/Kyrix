// libraries
const Project = require("../../src/index").Project;
const Canvas = require("../../src/Canvas").Canvas;
const Layer = require("../../src/Layer").Layer;
const View = require("../../src/View").View;
const Transform = require("../../src/Transform").Transform;

// project components (placement is not needed in this example)
const renderers = require("./renderers");

// construct a project
var p = new Project("word_cloud", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);

// transform
var t = new Transform(
    "SELECT full_name FROM mit_student_directory LIMIT 70;",
    "mit",
    "",
    ["wordCol"],
    true
);

// ================== the only canvas ===================
var wordCloud = new Canvas("word_cloud", 1000, 1000);
p.addCanvas(wordCloud);

// logo layer
var wordCloudLayer = new Layer(t, true);
wordCloud.addLayer(wordCloudLayer);
wordCloudLayer.addRenderingFunc(renderers.wordCloudRendering);

// ================== Views ===================
var view = new View("word_cloud", 1000, 1000);
p.addView(view);
p.setInitialStates(view, wordCloud, 0, 0);

// save to db
p.saveProject();
