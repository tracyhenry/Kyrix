const Transform = require("../../src/Transform").Transform;

var dotsTransform = new Transform("",
     "",
     function (){},
     ["chrom", "pos", "ref", "alt", "rsid", "log10pvalue", "beta", "nobs", "note", "genes", "consequence", "xpos"],
     true);

var regionTransform = new Transform("",
    "",
    function (){},
    ["chrom","pos", "ref", "alt", "rsid", "log10pvalue", "beta", "genes", "consequence", "title", "desciprtion", "value_type", "notes", "xpos"],
    true);

module.exports = {
    dotsTransform : dotsTransform,
    regionTransform : regionTransform
};
