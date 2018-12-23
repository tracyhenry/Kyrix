const Transform = require("../../src/index").Transform;

var idTransform = new Transform("select * from dots;",
    "wenbo",
    "",
    ["id", "x", "y", "type"],
    true);

module.exports = {
    idTransform : idTransform
};
