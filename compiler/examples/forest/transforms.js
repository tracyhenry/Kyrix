const Transform = require("../../src/Transform").Transform;

var c1BackgroundTransform = new Transform(
    "select * from canvas_bg where canvas_id = 1;",
    "forest",
    function(row, width, height, params) {
        var x =
            ((row[0] - 1) % params.colnumber[row[1] - 1]) *
                params.blockwidth[row[1] - 1] +
            params.blockwidth[row[1] - 1] / 2;
        var y =
            Math.floor((row[0] - 1) / params.colnumber[row[1] - 1]) *
                params.blockheight[row[1] - 1] +
            params.blockheight[row[1] - 1] / 2;
        var ret = [];
        ret.push(row[0]);
        ret.push(x);
        ret.push(y);
        ret.push(row[1]);
        ret.push(row[2]);
        ret.push(row[3]);

        return Java.to(ret, "java.lang.String[]");
    },
    ["id", "x", "y", "canvas_id", "farm_id", "url"],
    true
);

var c2BackgroundTransform = new Transform(
    "select * from canvas_bg where canvas_id = 2;",
    "forest",
    function(row, width, height, params) {
        var x =
            ((row[0] - 1) % params.colnumber[row[1] - 1]) *
                params.blockwidth[row[1] - 1] +
            params.blockwidth[row[1] - 1] / 2;
        var y =
            Math.floor((row[0] - 1) / params.colnumber[row[1] - 1]) *
                params.blockheight[row[1] - 1] +
            params.blockheight[row[1] - 1] / 2;
        var ret = [];
        ret.push(row[0]);
        ret.push(x);
        ret.push(y);
        ret.push(row[1]);
        ret.push(row[2]);
        ret.push(row[3]);

        return Java.to(ret, "java.lang.String[]");
    },
    ["id", "x", "y", "canvas_id", "farm_id", "url"],
    true
);

var c3BackgroundTransform = new Transform(
    "select * from canvas_bg where canvas_id = 3;",
    "forest",
    function(row, width, height, params) {
        var x =
            ((row[0] - 1) % params.colnumber[row[1] - 1]) *
                params.blockwidth[row[1] - 1] +
            params.blockwidth[row[1] - 1] / 2;
        var y =
            Math.floor((row[0] - 1) / params.colnumber[row[1] - 1]) *
                params.blockheight[row[1] - 1] +
            params.blockheight[row[1] - 1] / 2;
        var ret = [];
        ret.push(row[0]);
        ret.push(x);
        ret.push(y);
        ret.push(row[1]);
        ret.push(row[2]);
        ret.push(row[3]);

        return Java.to(ret, "java.lang.String[]");
    },
    ["id", "x", "y", "canvas_id", "farm_id", "url"],
    true
);

var c1AnimalTransform = new Transform(
    "select * from animal;",
    "forest",
    function(row, width, height, params) {
        var x =
            (parseInt(row[8]) / params.canvaswidth[1]) * params.canvaswidth[0];
        var y =
            (parseInt(row[9]) / params.canvasheight[1]) *
            params.canvasheight[0];
        var ret = [];
        ret.push(row[0]);
        ret.push(row[1]);
        ret.push(row[2]);
        ret.push(row[3]);
        ret.push(row[4]);
        ret.push(x);
        ret.push(y);
        ret.push(0.5);

        return Java.to(ret, "java.lang.String[]");
    },
    ["kind", "name", "species", "family", "habitat", "x", "y", "r"],
    true
);

var c2AnimalTransform = new Transform(
    "select * from animal;",
    "forest",
    function(row) {
        var x = parseInt(row[8]);
        var y = parseInt(row[9]);
        var ret = [];
        ret.push(row[0]);
        ret.push(row[1]);
        ret.push(row[2]);
        ret.push(row[3]);
        ret.push(row[4]);
        ret.push(x);
        ret.push(y);
        ret.push(2);

        return Java.to(ret, "java.lang.String[]");
    },
    ["kind", "name", "species", "family", "habitat", "x", "y", "r"],
    true
);

var c3AnimalTransform = new Transform(
    "select * from animal;",
    "forest",
    function(row, width, height, params) {
        var x =
            (parseInt(row[8]) / params.canvaswidth[1]) * params.canvaswidth[2];
        var y =
            (parseInt(row[9]) / params.canvasheight[1]) *
            params.canvasheight[2];
        var ret = [];
        ret.push(row[0]);
        ret.push(row[1]);
        ret.push(row[2]);
        ret.push(row[3]);
        ret.push(row[4]);
        ret.push(x);
        ret.push(y);
        ret.push(35);
        ret.push(row[7]);

        return Java.to(ret, "java.lang.String[]");
    },
    ["kind", "name", "species", "family", "habitat", "x", "y", "r", "url"],
    true
);

module.exports = {
    c1BackgroundTransform: c1BackgroundTransform,
    c2BackgroundTransform: c2BackgroundTransform,
    c3BackgroundTransform: c3BackgroundTransform,
    c1AnimalTransform: c1AnimalTransform,
    c2AnimalTransform: c2AnimalTransform,
    c3AnimalTransform: c3AnimalTransform
};
