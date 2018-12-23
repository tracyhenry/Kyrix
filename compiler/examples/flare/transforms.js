const Transform = require("../../src/index").Transform;

var flareTransform = new Transform("select * from flare;",
    "flare",
    "",
    ["id", "name", "size", "parent_id", "depth"],
    true);

module.exports = {
    flareTransform : flareTransform
};
