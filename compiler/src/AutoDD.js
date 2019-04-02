/**
 * Constructor of an AutoDD object
 * @param args
 * @constructor
 */
function AutoDD(args) {

    // query, db, xCol, yCol, bboxW, bboxH
    if (args == null)
        args = {};

    // check required args
    var requiredArgs = ["query", "db", "xCol", "yCol", "bboxW", "bboxH"];
    var requiredArgsTypes = ["string", "string", "string", "string", "number", "number"];
    for (var i = 0; i < requiredArgs.length; i ++) {
        if (! (requiredArgs[i] in args))
            throw new Error("Constructing AutoDD: " + requiredArgs[i] + " missing.");
        if (typeof args[requiredArgs[i]] !== requiredArgsTypes[i])
            throw new Error("Constructing AutoDD: " + requiredArgs[i] + " must be " + requiredArgsTypes[i] + ".");
        if (requiredArgsTypes[i] == "string")
            if (args[requiredArgs[i]].length == 0)
                throw new Error("Constructing AutoDD: " + requiredArgs[i] + " cannot be an empty string.");
    }

    // other constraints
    if (args["bboxW"] <= 0 || args["bboxH"] <= 0)
        throw new Error("Constructing AutoDD: non-positive bbox size.");
    if ("axis" in args && (! "loX" in args || ! "loY" in args || ! "hiX" in args || ! "hiY" in args))
        throw new Error("Constructing AutoDD: raw data domain needs to be specified for rendering an axis.");
    if (("loX" in args || "loY" in args || "hiX" in args || "hiY" in args) &&
        ! ("loX" in args && "loY" in args && "hiX" in args && "hiY" in args))
        throw new Error("Constructing AutoDD: loX, loY, hiX, hiY must all be provided.");

    // assign fields
    for (var i = 0; i < requiredArgs.length; i ++)
        this[requiredArgs[i]] = args[requiredArgs[i]];
    this.rendering = ("rendering" in args ? args.rendering : null);
    this.columnNames = ("columnNames" in args ? args.columnNames : []);
    this.numLevels = ("numLevels" in args ? args.numLevels : 5);
    this.topLevelWidth = ("topLevelWidth" in args ? args.topLevelWidth : 1000);
    this.topLevelHeight = ("topLevelHeight" in args ? args.topLevelHeight : 1000);
    this.zoomFactor = ("zoomFactor" in args ? args.zoomFactor : 2);
    this.axis = ("axis" in args ? args.axis : false);
    this.loX = ("loX" in args ? args.loX : null);
    this.loY = ("loY" in args ? args.loY : null);
    this.hiX = ("hiX" in args ? args.hiX : null);
    this.hiY = ("hiY" in args ? args.hiY : null);
};

// exports
module.exports = {
    AutoDD : AutoDD
};
