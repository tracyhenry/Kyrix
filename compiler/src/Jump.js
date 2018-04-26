/**
 * Construct jump transition between two canvases
 * @param {string} sourceID - the id of the source canvas
 * @param {string} destID - the id of the destination canvas
 * @param {array} newViewports - an array of javascript functions calculating the new viewport (see api doc for more details)
 * @param {array} newPredicates - an array of javascript functions calculating predicates for the new canvas
 * @param {string} type - a string indicating the type of this jump, could be one of "literal_zoom_in", "literal_zoom_out", or "semantic_zoom" (or maybe something else in the future)
 * @constructor
 */
function Jump(sourceId, destId, newViewports, newPredicates, type) {

    this.sourceId = sourceId;
    this.destId = destId;
    this.newViewports = newViewports;
    this.newPredicates = newPredicates;
    this.type = type;
};

// exports
module.exports = {
    Jump : Jump
};
