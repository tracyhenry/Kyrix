/**
 * Constructor of an AutoDD object
 * @param query
 * @param xCol
 * @param yCol
 * @param smallestBboxSize
 * @param largestBBoxSize
 * @param optional
 * @constructor
 */
function AutoDD(query, db, xCol, yCol, bboxW, bboxH, optional) {

    if (optional == null)
        optional = {};
    // check constraints
    if (typeof query !== "string")
        throw new Error("Constructing Transform: separable must be boolean.");

    // assign fields
    this.query = query;
    this.db = db;
    this.xCol = xCol;
    this.yCol = yCol;
    this.bboxW = bboxW;
    this.bboxH = bboxH;
    this.rendering = ("rendering" in optional ? optional.rendering : null);
    this.columnNames = ("columnNames" in optional ? optional.columnNames : []);
    this.numLevels = ("numLevels" in optional ? optional.numLevels : 5);
    this.topLevelWidth = ("topLevelWidth" in optional ? optional.topLevelWidth : 1000);
    this.topLevelHeight = ("topLevelHeight" in optional ? optional.topLevelHeight : 1000);
    this.zoomFactor = ("zoomFactor" in optional ? optional.zoomFactor : 2);
};

// exports
module.exports = {
    AutoDD : AutoDD
};
