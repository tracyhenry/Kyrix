// libraries
const Project = require("../../src/index").Project;
const Jump = require("../../src/Jump").Jump;
const View = require("../../src/View").View;
const USMap = require("../../src/template-api/USMap").USMap;

// construct a project
var p = new Project("usmap_cmv", "../../../config.txt");

// ================== Views ===================
var stateMapWidth = 2000;
var stateMapHeight = 1000;
var view = new View("state", stateMapWidth, stateMapHeight);
p.addView(view);

var rightView = new View("county", stateMapWidth, stateMapHeight);
p.addView(rightView);

// specify args
var args = {
    db: "usmap",
    state: {
        table: "state",
        column: "crimerate",
        range: [0, 582],
        step: 100
    },
    county: {
        table: "county",
        column: "crimerate",
        range: [0, 1792],
        step: 250
    },
    zoomType: "none",
    legendTitle: "Crime rate per 100,000 people",
    tooltipAlias: "Crime rate"
};

// build project
var USMapProject = new USMap(args);
var pyramid = p.addUSMap(USMapProject, {view: view}).pyramid;
p.setInitialStates(view, pyramid[0], 0, 0);

// ================== state -> county ===================
var selector = function(row, args) {
    return args.layerId == 1;
};

var newPredicates = function() {
    return {};
};

var newViewport = function(row, args) {
    var zoomFactor = 6; // default in usmap template api
    var vpW = args.viewportW;
    var vpH = args.viewportH;
    return {
        constant: [
            row.bbox_x * zoomFactor - vpW / 2,
            row.bbox_y * zoomFactor - vpH / 2
        ]
    };
};

var jumpName = function(row) {
    return "County map of " + row.name;
};

p.addJump(
    new Jump(pyramid[0], pyramid[1], "load", {
        selector: selector,
        viewport: newViewport,
        predicates: newPredicates,
        name: jumpName,
        sourceView: view,
        destView: rightView
    })
);

// save to db
p.saveProject();
