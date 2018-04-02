/**
 * Constructor for a data transform.
 * @param {string} id - identifier of this transform
 * @param {string} query - a SQL query. The result of this query is fed as input to the transform function.
 * @param {string} db - the database that query is run in.
 * @param transformFunc - a Javascript function receiving the SQL query result as input and doing some data transforms.
 * @param {boolean} separable - whether the calculation of transformFunc is per-tuple based. If yes, the input to transformFunc is a single tuple. Otherwise their input is the whole query result. The separability of a layer depends on the separability of the data transform it uses.
 * @constructor
 */
function Transform(id, query, db, transformFunc, separable) {

    if (typeof transformFunc !== "function")
        throw new Error("Constructing Transform: transformFunc must be a javascript function.");
    if (typeof separable !== "boolean")
        throw new Error("Constructing Transform: separable must be boolean.");

    // assign fields
    this.id = id;
    this.query = query;
    this.db = db;
    this.transformFunc = transformFunc;
    this.separable = separable;
};

// exports
module.exports = {
    Transform: Transform
};
