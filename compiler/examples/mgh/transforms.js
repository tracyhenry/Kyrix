const Transform = require("../../src/index").Transform;

var dummyEEGTransform = new Transform("eegdummy",
    "",
    "",
    function (){
    },
    [],
    true);


module.exports = {
    dummyEEGTransform : dummyEEGTransform
};
