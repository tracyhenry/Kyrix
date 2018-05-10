/**
 * Construct jump transition between two canvases
 * @param {string} sourceID - the id of the source canvas
 * @param {string} destID - the id of the destination canvas
 * @param {array} newViewports - an array of javascript functions calculating the new viewport (see api doc for more details)
 * @param {array} newPredicates - an array of javascript functions calculating predicates for the new canvas
 * @param {string} type - a string indicating the type of this jump, could be one of "literal_zoom_in", "literal_zoom_out", or "semantic_zoom" (or maybe something else in the future)
 * @param {string}/{function} name - the name of this jump, could be a string, or a function taking the jumping entity as input and returning the name.
 * @param {string} - staticTrimArguments, a function which takes jump entity as input, and output an array of extra arguments for the static trim function.
 * @constructor
 */
function Jump(sourceId, destId, newViewports, newPredicates, type, name, newStaticTrimArguments) {

    this.sourceId = sourceId;
    this.destId = destId;
    this.newViewports = newViewports;
    this.newPredicates = newPredicates;
    this.type = type;
    if (name != null)
        this.name = name;
    else
        this.name = destId;
    if (newStaticTrimArguments != null)
        this.newStaticTrimArguments = newStaticTrimArguments;
    else
        this.newStaticTrimArguments = "";
};

// exports
module.exports = {
    Jump : Jump
};
