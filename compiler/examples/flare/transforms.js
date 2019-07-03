const Transform = require("../../src/Transform").Transform;

var flareTransform = new Transform(
    "select * from flare;",
    "flare",
    "",
    [],
    true
);

module.exports = {
    flareTransform: flareTransform
};
