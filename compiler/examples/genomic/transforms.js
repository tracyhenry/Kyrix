const Transform = require("../../src/Transform").Transform;

var idTransform = new Transform(
    "select * from top10k;",
    "raw",
    function (row, width, height){
        var chrom_length = [249250621, 243199373, 198022430, 191154276, 180915260, 171115067, 159138663, 146364022, 141213431,
            135534747, 153006516, 133851895, 115169878, 107349540, 102531392, 90354753, 81195210,
            78077248, 59128983, 63025520, 48129895, 51304566, 155270560, 59373566];
        var ret = [];
        var x = +row[3];
        for (var i= 0 ; i < row[2]-1; i++){
            x += chrom_length[i];
        }
        ret.push(d3.scaleLinear().domain([0, 3e9]).range([0, width])(x));
        ret.push(d3.scaleLinear().domain([350, 0]).range([0, height])(row[4]));
        ret.push(+row[0]);
        return Java.to(ret ,"java.lang.String[]");
    },
    ["x", "y", "icd_idx"],
    true);

var phenotypeTransform = new Transform(
    "select * from phenotype;",
    "raw",
    function (row, width, height) {
        var id = parseInt(row[0]);
        var y = Math.floor(id / 100);
        var x = id - y * 100;
        var ret = [];
        ret.push(row[0]);
        ret.push(d3.scaleLinear().domain([0, 4020]).range([0, width])((x*2+1)*20));
        ret.push(d3.scaleLinear().domain([0, 70]).range([0, height])(y));
        ret.push(row[1]);
        ret.push(row[2]);
//	ret.push(row[3]);
//	ret.push(row[4]);

        return Java.to(ret, "java.lang.String[]");
    },
    ["id", "x", "y", "coding", "no"],
    true
);

var emptyTransform = new Transform(
    "",
    "",
    function (row) {}, [], true
);

module.exports = {
    idTransform : idTransform,
    phenotypeTransform : phenotypeTransform,
    emptyTransform : emptyTransform
};
