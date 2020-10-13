const getBodyStringOfFunction = require("./Utilities").getBodyStringOfFunction;

/*
 * Constructor of a table
 * @param args
 * @constructor
 * by xinli on 07/15/19
 */

function Table(args) {
    if (args == null) args = {};

    // check required args
    var requiredArgs = ["table", "db", "fields"];
    var requiredArgsTypes = ["string", "string", "object"];
    for (var i = 0; i < requiredArgs.length; i++) {
        if (!(requiredArgs[i] in args))
            throw new Error(
                "Constructing Table: " + requiredArgs[i] + " missing."
            );
        if (typeof args[requiredArgs[i]] !== requiredArgsTypes[i])
            throw new Error(
                "Constructing Table: " +
                    requiredArgs[i] +
                    " must be " +
                    requiredArgsTypes[i] +
                    "."
            );
        if (requiredArgsTypes[i] == "string")
            if (args[requiredArgs[i]].length == 0)
                throw new Error(
                    "Constructing Table: " +
                        requiredArgs[i] +
                        " cannot be an empty string."
                );
    }

    this.table = args.table;
    this.db = args.db;

    this.group_by = [];
    if (args.group_by) {
        if (typeof args.group_by === "string") this.group_by = [args.group_by];
        else {
            try {
                args.group_by.every(column => {
                    return typeof column === "string";
                });
                this.group_by = args.group_by;
            } catch (err) {
                throw new Error("group_by must be string or array of strings");
            }
        }
    }

    var group_by = this.group_by;
    var fields = args.fields;
    // schema and query first for buiding layer
    this.schema = genSchema();
    var schema = this.schema;
    this.query = args.query || genQuery();

    // TODO: check the type of arguments
    this.cell_height = args.cell_height || 40;
    this.x = args.x || 0;
    this.y = args.y || 0;

    // get sum_width & width
    var sum_width = 0;
    var centroid_x = 0;
    var key_index = 0;
    if (typeof args.width === "number") {
        sum_width = args.width;
    } else if (typeof args.width === "object") {
        if (Array.isArray(args.width)) {
            // ES6 grammer for array
            if (args.width.length != args.fields.length)
                throw new Error(
                    "Constructing Table: incompatible length between width and fields"
                );
            for (var wi of args.width) {
                if (typeof wi !== "number") {
                    throw new Error(
                        "Constructing Table: table.args.width with non-numeric object"
                    );
                }
                sum_width += wi;
            }
        } else {
            var widths = new Array(args.fields.length).fill(100);
            for (var key in args.width) {
                if (typeof key !== "string")
                    throw new Error(
                        "Constructing Table: width's key must be string"
                    );
                if (typeof args.width[key] !== "number")
                    throw new Error(
                        "Constructing Table: width's value must be number"
                    );
                key_index = args.fields.indexOf(key);
                if (key_index >= 0) {
                    widths[key_index] = args.width[key];
                } else {
                    throw new Error(
                        "Constructing Table: width field not given in fields:" +
                            key
                    );
                }
            }
            sum_width = widths.reduce((prev, curr) => prev + curr, 0);
        }
    } else {
        console.log("Constructing Table: DEFAULT WIDTH");
        sum_width = args.fields.length * 100;
    }
    centroid_x = this.x + sum_width / 2;
    this.width = widths || sum_width;
    this.sum_width = sum_width;

    // get heads
    var heads;
    if (!args.heads || args.heads == "auto") {
        heads = {
            height: this.cell_height,
            names: args.fields
        };
    } else if (args.heads == "none") {
        heads = {
            height: 0,
            names: []
        };
    } else {
        var th_args = args.heads;
        th_args.height = args.heads.height || this.cell_height;
        th_args.names = args.heads.names || args.fields;
        if (typeof th_args.height !== "number")
            throw new Error(
                "Constructing Table: heading height must be number"
            );
        if (typeof th_args.names !== "object")
            throw new Error(
                "Constructing Table: heading names must be an object"
            );
        if (
            Array.isArray(th_args.names) &&
            th_args.names.length != args.fields.length
        )
            throw new Error(
                "Constructing Table: fields and heads length not equal"
            );
        if (th_args.height <= 0)
            throw new Error(
                "Constructing Table: heading height must be positive"
            );

        // deep copy of args.fields
        if (!Array.isArray(th_args.names)) {
            var [...th_names] = args.fields;
            for (var key in th_args.names) {
                if (typeof key !== "string")
                    throw new Error(
                        "Constructing Table: heads.names's key must be string"
                    );
                if (typeof th_args.names[key] !== "string")
                    throw new Error(
                        "Constructing Table: heads.names's value must be string"
                    );
                key_index = args.fields.indexOf(key);
                if (key_index >= 0) {
                    th_names[key_index] = th_args.names[key];
                } else {
                    throw new Error(
                        "Constructing Table: heads.name field not given in fields:",
                        key
                    );
                }
            }
            th_args.names = th_names;
        }
        heads = th_args;
    }
    this.heads_height = heads.height;
    this.heads_names = heads.names;

    this.placement = {
        centroid_x: "con:" + centroid_x,
        centroid_y: "col:kyrix_ty",
        width: "con:" + sum_width,
        height: "con:" + this.cell_height
    };

    function genSchema() {
        if (!group_by || !group_by.length > 0)
            return args.fields.concat(["rn", "kyrix_ty"]);
        else {
            var ret = args.fields.concat(["rn", "kyrix_ty"]);
            for (var i = group_by.length - 1; i >= 0; i--) {
                if (fields.indexOf(group_by[i]) < 0) {
                    ret.push(group_by[i]);
                }
            }
            return ret;
        }
    }

    // generate query using user defined specifications
    function genQuery() {
        var ret = "select ";
        for (key in args.fields) {
            if (typeof args.fields[key] !== "string") {
                throw new Error(
                    "Constructing Table: fields must be string, at index:" + key
                );
            }
            ret += args.fields[key] + ", ";
        }
        ret += "row_number() over(";
        if (args.order_by) {
            ret += " order by ";
            ret += args.order_by;
            if (args.order == ("asc" || "ASC")) {
                ret += " asc ) as rn_kyrix";
            } else if (args.order == ("desc" || "DESC") || !args.order) {
                ret += " desc ) as rn_kyrix";
            } else {
                throw new Error("Constructing Table: unknown order");
            }
        } else {
            ret += ")";
        }
        for (var i = schema.indexOf("kyrix_ty") + 1; i < schema.length; i++) {
            ret += ", " + schema[i];
        }
        ret += " from ";
        ret += args.table;
        ret += ";";
        console.log("Constructing Table: query-", ret);
        return ret;
    }
}

function getTableTransformFunc() {
    transformFuncBody = getBodyStringOfFunction(transform_function);
    transformFuncBody = transformFuncBody.replace(
        /REPLACE_ME_table_name/g,
        this.name
    );

    return new Function(
        "row",
        "w_canvas",
        "h_canvas",
        "renderParams",
        transformFuncBody
    );

    function transform_function(row, w_canvas, h_canvas, renderParams) {
        var ret = [];
        // row: args.fields, rn_kyrix
        var args = renderParams["REPLACE_ME_table_name"];
        for (var i = 0; i < args.fields.length; i++) {
            ret.push(row[i]);
        }
        ret.push(row[args.fields.length]);
        var head_height = Number(args.heads.height) || 0;

        var centroid_y =
            head_height +
            Number(args.y) +
            Number(args.cell_height) *
                Number(parseInt(row[args.fields.length]) - 0.5);
        ret.push(centroid_y);
        return Java.to(ret, "java.lang.String[]");
    }
}

function getTableRenderer() {
    renderFuncBody = getBodyStringOfFunction(renderer);
    renderFuncBody = renderFuncBody.replace(
        /REPLACE_ME_table_name/g,
        this.name
    );

    return new Function("svg", "data", "rend_args", renderFuncBody);

    function renderer(svg, data, rend_args) {
        var table_params = rend_args.renderingParams["REPLACE_ME_table_name"];
        var fields = table_params.fields;
        var table = svg.append("g");

        var x = Number(table_params.x) || 0;
        var y = Number(table_params.y) || 0;

        var cell_W =
            typeof table_params.width === "object"
                ? table_params.width
                : new Array(fields.length).fill(
                      table_params.width / fields.length
                  );
        var cell_X = [x];
        var sum_width = cell_W[0];
        for (var i = 1; i < fields.length; i++) {
            cell_X.push(cell_X[i - 1] + cell_W[i - 1]);
            sum_width += cell_W[i];
        }
        var cell_H = table_params.cell_height;

        var th_params = table_params.heads;
        var th_X = cell_X;
        var th_Y = y;
        var th_W = cell_W;
        var th_H = th_params.height;
        var th_Names = th_params.names || fields;

        if (th_H > 0) {
            var ths = table
                .append("g")
                .datum({
                    minx: 0,
                    maxx: sum_width,
                    miny: 0,
                    maxy: th_H
                })
                .attr("class", "thead")
                .attr("transform", function(d, i) {
                    return "translate(0," + th_Y + ")";
                });
        }

        var trs = table
            .selectAll(".tr")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "tr")
            .attr("transform", function(d) {
                return `translate(0, ${d.miny} )`;
            });

        for (var index = 0; index < fields.length; index++) {
            if (th_H > 0) {
                var th = ths
                    .append("g")
                    .attr("class", "th " + th_Names[index])
                    .attr("transform", "translate(" + th_X[index] + ",0)");

                th.append("rect")
                    .attr("width", th_W[index])
                    .attr("height", th_H);

                th.append("text")
                    .text(th_Names[index])
                    .attr("dx", th_W[index] / 2)
                    .attr("y", th_H / 2)
                    .attr("dy", "0.5em");
            }

            trs.each(function(d, i, nodes) {
                var tr = d3.select(this);
                var cell = tr
                    .append("g")
                    .attr("class", function(d, i) {
                        return "td cell " + fields[index];
                    })
                    .attr("transform", function(d, i) {
                        return "translate(" + cell_X[index] + ",0)";
                    })
                    .attr("width", cell_W[index])
                    .attr("height", cell_H);

                cell.append("rect")
                    .attr("class", "rect bg")
                    .attr("width", cell_W[index])
                    .attr("height", cell_H);
                cell.append("text")
                    .text(function(d) {
                        return d[fields[index]];
                    })
                    .attr("dx", cell_W[index] / 2)
                    .attr("y", cell_H / 2)
                    .attr("dy", "0.5em");
            });
        }
    }
}

Table.prototype = {
    getTableTransformFunc,
    getTableRenderer
};

module.exports = {
    Table: Table,
    getTableTransformFunc,
    getTableRenderer
};
