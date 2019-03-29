/**
 * Constructor for a data transform.
 * @param {string} query - a SQL query. The result of this query is fed as input to the transform function.
 * @param {string} db - the database that query is run in.
 * @param transformFunc - a Javascript function receiving the SQL query result as input and doing some data transforms.
 * @param columnNames - an array containing the names of the columns after data transformation
 * @param {boolean} separable - whether the calculation of transformFunc is per-tuple based. If yes, the input to transformFunc is a single tuple. Otherwise their input is the whole query result. The separability of a layer depends on the separability of the data transform it uses.
 * @constructor
 */
function Transform(query, db, transformFunc, columnNames, separable) {

    if (typeof separable !== "boolean")
        throw new Error("Constructing Transform: separable must be boolean.");
    if (! Array.isArray(columnNames))
        throw new Error("Constructing Transform: column names must be an array.");
    if (columnNames.length == 0 && transformFunc != "")
        throw new Error("Constructing Transform: column names must be provided if transform function exists.");

    // assign fields
    this.query = query;
    this.db = db;
    this.columnNames = columnNames;
    this.transformFunc = transformFunc;
    this.separable = separable;
};

defaultEmptyTransform = new Transform("", "", "", [], true);

// exports
module.exports = {
    Transform : Transform,
    defaultEmptyTransform : defaultEmptyTransform
};
