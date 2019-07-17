

const Transform = require("../Transform").Transform;
const Layer = require("../Layer").Layer;
/*
* Constructor of a table
* @param args
* @constructor
* by xinli on 07/15/19
*/

function Table(args, p) {
    if (args == null) args = {};

    if (
        // !("query" in args) ||
        !("name" in args) ||
        !("db" in args)
        // !("width" in args)
        // !("cell_h" in args)
    ){
        throw new Error("Constructing Table:\
             malformed argument object");
    }


    this.query = args.query || genQuery();

    // TODO: check the type of arguments
    this.cell_h = args.cell_h || 40;
    this.x = args.x || 0;
    this.y = args.y || 0;
    this.db = args.db;

    if ( (typeof(args.fields) === "object") ){
        console.log("fields not object!!!");
        var transform_func = function(row, 
                w_canvas, h_canvas, renderParams){
            var ret = [];
            // row: args.fields, rn_kyrix
            var args = renderParams.table;
            for (var i = 0; i < args.fields.length; i++){
                ret.push(row[i]);
            }
            ret.push(row[args.fields.length]);
            var th_h = Number(args.heads.th_h) || 0;

            var centroid_y = th_h + Number(args.y) + Number(args.cell_h) * 
            // var centroid_y = Number(args.y) + Number(this.cell_h) * 
                Number( parseInt(row[args.fields.length]) - 0.5 );
            ret.push(centroid_y);
            return Java.to(ret ,"java.lang.String[]");
        }
    }

    var sum_width = 0;
    var centroid_x  = 0;
    if (typeof args.width === "number"){
        sum_width = args.width;
        centroid_x = this.x + args.width / 2;
    }
    else if (typeof args.width === "object"){
        for (key in args.width){
            if (typeof(args.width[key]) !== "number" ){
                throw new Error("Error, \
                    table.args.width with non-numeric object")
            }
            sum_width += args.width[key];
        }
        centroid_x = this.x + sum_width / 2;
    }
    else{
        console.log("DEFAULT WIDTH");
        // sum_width = 1000;
        sum_width = args.fields.length * 100;
        centroid_x = this.x + sum_width / 2;
        // throw new Error("width type not supported");
    }
    this.width = sum_width

    var th_args = args.heads;
    if(!(th_args)){
        this.heads = {
            th_h: 0,
            names: []
        }
    } else if (th_args == "auto") {
        this.heads = {
            th_h: this.cell_h,
            names: args.fields
        }
    } else {
        this.heads = args.heads
    }

    // var table_name = "table_" + args.name;
    var tableRenderingParams = {
        // table_name: {
        table: {
            x: this.x,
            y: this.y,
            heads: this.heads,
            width: this.width,
            cell_h: this.cell_h,
            fields: args.fields
        }
    }

    console.log("tableRenderingParams", tableRenderingParams);
    p.addRenderingParams(tableRenderingParams);

    var schema = args.fields.concat(['rn', 'y']);
    // var schema = args.fields.concat(['y']);

    console.log("schema", schema);

    var transform = new Transform(
        this.query,
        args.db,
        transform_func,
        schema,
        true
    );

    var tablePlacement = {
        "centroid_x" : "con:" + centroid_x,
        "centroid_y" : "col:y",
        "width" : "con:" +  sum_width,
        "height" : "con:" + this.cell_h
    }

    console.log("tablePlacement", tablePlacement);

    var tableRendering = function(svg, data, rend_args) {
        var table_params = rend_args.renderingParams.table;
        var fields = table_params.fields;
        console.log("data[0]", data[0]);
        var g = svg.append("g")
            .attr("id", "gTable");

        // var stat = g.append("text")
        //     .datum(data.length)
        //     .attr("x", 500)
        //     .attr("y", 100)
        //     .text(function(d){
        //         return "number of results: " + String(d) + " teams";
        //     })

        /*var tableRenderingParams = {
            table: {
                x: this.x,
                y: this.y,
                heads: this.heads,
                width: args.width,
                height: args.height,
                fields: args.fields
            }
        }*/
        var x = Number(table_params.x) || 0;
        var y = Number(table_params.y) || 0;

        var cell_W = (typeof(table_params.width) === 'object')?
            table_params.width :
            new Array(fields.length)
                .fill(table_params.width / fields.length);
        var cell_X = [x];
        for (var i = 1; i < fields.length; i++){
            cell_X.push(cell_X[i - 1] + cell_W[i - 1]);
        }
        var cell_H = table_params.cell_h;

        var th_params = table_params.heads;
        var th_X = cell_X;
        var th_Y = y;
        var th_W = cell_W;
        var th_H = th_params.th_h;
        var th_Names = th_params.names || fields;
        console.log("table_params", table_params);

        var table = g.append("g")
            .attr("width", table_params.width)
            .attr("height", 500) //TODO: not hard code it
            .attr("id", "kyrix_table")

        var ths = table.append("g")
            .attr("class", "thead")
            .attr("transform", function(d, i){
                return "translate(0," + th_Y + ")";
            })

        var trs = table.selectAll(".tr")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "tr")
            .attr("transform", function(d){
                return "translate(0,"
                    + (d["y"]-cell_H/2) + ")"; 
            })

        for (var index = 0; index < fields.length; index++){
            var th = ths.append("g")
                .attr("class", ("th " + th_Names[index]) )
                .attr("transform", "translate(" + th_X[index] + ",0)" )

            trs.each(function(d, i, nodes){
                var tr = d3.select(this);
                var cell = tr.append("g")
                    .attr("class", function(d, i){
                        return "td cell " + fields[index];
                    })
                    .attr("transform", function(d,i){
                        return "translate(" + cell_X[index] +",0)";
                    })
                    .attr("width", cell_W[index])
                    .attr("height", cell_H)

                cell.append("rect")
                    .attr("class", "rect bg")
                    .attr("width", cell_W[index])
                    .attr("height", cell_H)
                cell.append("text")
                    .text(function(d){
                        return d[fields[index]];
                    })
                    .attr("dx", cell_W[index] / 2)
                    .attr("y", cell_H / 2)
                    .attr("dy", "0.5em")
            })

            th.append("rect")
                .attr("width", th_W[index])
                .attr("height", th_H)

            th.append("text")
                .text(th_Names[index])
                .attr("dx", th_W[index] / 2)
                .attr("y", th_H / 2)
                .attr("dy", "0.5em")
        }
    }

    var tableLayer = new Layer(transform, false);

    tableLayer.addPlacement(tablePlacement);
    tableLayer.addRenderingFunc(tableRendering);

    // generate query using user defined specifications
    function genQuery(){

        var ret = "select ";
        for (key in args.fields){
            if (typeof(args.fields[key]) !== "string"){
                throw new Error("fields must be string, at index:" + key);
            }
            ret += (args.fields[key] + ", ");
        }
        ret += "row_number() over(";
        if (args.order_by){
            ret += " order by ";
            ret += args.order_by;
            if (args.order == ("asc"||"ASC")){
                ret += " asc ) as rn_kyrix";
            }
            else if (args.order == ("desc"||"DESC")
                    || (!args.order)
                ){
                ret += " desc ) as rn_kyrix";
            }
            else {
                throw new Error("unknown order");
            }
        }
        else{
            ret += ")"
        }
        ret += " from ";
        ret += args.table;
        ret += ";";
        console.log("query:", ret);
        return ret;
    }

    return tableLayer;
    // this = tableLayer;
    // body...
}

module.exports = {
    Table: Table
}
