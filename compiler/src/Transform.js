var getBodyStringOfFunction = require("./template-api/Utilities")
    .getBodyStringOfFunction;

// simple parse JS function for its parameters - note that it only works in simple cases, like ours
// https://stackoverflow.com/a/9924463
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
var ARGUMENT_NAMES = /([^\s,]+)/g;
function getFuncParamNames(func) {
    var fnStr = func.toString().replace(STRIP_COMMENTS, "");
    var result = fnStr
        .slice(fnStr.indexOf("(") + 1, fnStr.indexOf(")"))
        .match(ARGUMENT_NAMES);
    if (result === null) result = [];
    return result;
}

/**
 * Constructor for a data transform.
 * @param {string} query - a SQL query. The result of this query is fed as input to the transform function.
 * @param {string} db - the database that query is run in.
 * @param transformFunc - a Javascript function receiving the SQL query result as input and doing some data transforms.
 * @param columnNames - an array containing the names of the columns after data transformation
 * @param {boolean} separable - whether the calculation of transformFunc is per-tuple based. If yes, the input to transformFunc is a single tuple. Otherwise their input is the whole query result. The separability of a layer depends on the separability of the data transform it uses. This is not functioning, to be removed.
 * @param filterableColumnNames the columns that can be applied filters on. May be different from columnNames.
 * @constructor
 */
function Transform(
    query,
    db,
    transformFunc,
    columnNames,
    separable,
    filterableColumnNames
) {
    if (typeof query == "object") {
        if (arguments.length > 1)
            throw new Error(
                "Constructing Transform: object-style construction may only have one argument"
            );

        this.transformFunc = query["transformFunc"];
        this.transformFuncBody = getBodyStringOfFunction(this.transformFunc);
        if (typeof this.transformFunc !== "function")
            throw new Error(
                "Constructing Transform: transformFunc required and must be a JavaScript function"
            );
        matches = this.transformFunc
            .toString()
            .match(/\/\/ *@result: *([a-zA-Z_][a-zA-Z0-9_]*)/g);
        if (!matches || matches.length == 0)
            throw new Error(
                "Constructing Transform: transformFunc must specify output column names with @result."
            );

        this.params = getFuncParamNames(this.transformFunc);
        if (this.params.length == 0)
            throw new Error(
                "Constructing Transform: transformFunc must take parameters (whose names match the dbsource output)"
            );

        this.columnNames = matches
            .join(",")
            .replace(/\/\/ *@result: */g, "")
            .split(","); // safe bec we restricted the charset above
        console.log("columnNames=" + this.columnNames);

        this.dbsource = query["dbsource"];
        this.db = "src_db_same_as_kyrix";
        if (typeof this.dbsource !== "string")
            throw new Error(
                "Constructing Transform: dbsource required and must be a string"
            );
        if (this.dbsource.toUpperCase().startsWith("SELECT ")) {
            this.query = this.dbsource;
        } else {
            // should be a table or view name - simple regexp checker...
            var tblviewRx = /^([a-z_][a-z0-9_]*[.])?[a-z_][a-z0-9_]*$/i;
            if (!this.dbsource.toUpperCase().match(tblviewRx))
                throw new Error(
                    "Constructing Transform: illegal table/view name - letters, numbers, underscores only"
                );
            this.query =
                "SELECT " + this.params.join(",") + " FROM " + this.dbsource;
            console.log(this.query);
        }
        this.separable = query["separable"] || true;
        return;
    }

    if (typeof separable !== "boolean")
        throw new Error("Constructing Transform: separable must be boolean.");
    if (!Array.isArray(columnNames))
        throw new Error(
            "Constructing Transform: column names must be an array."
        );
    if (columnNames.length == 0 && transformFunc != "")
        throw new Error(
            "Constructing Transform: column names must be provided if transform function exists."
        );

    // assign fields
    this.query = query;
    this.db = db;
    this.columnNames = columnNames;
    this.transformFunc = transformFunc;
    if (transformFunc == "") this.transformFuncBody = "";
    else this.transformFuncBody = getBodyStringOfFunction(this.transformFunc);
    this.separable = separable;
    this.filterableColumnNames =
        filterableColumnNames == null ? [] : filterableColumnNames;
}

defaultEmptyTransform = new Transform("", "", "", [], true);

// exports
module.exports = {
    Transform,
    defaultEmptyTransform
};
