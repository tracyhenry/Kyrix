/**
 * Construct jump transition between two canvases
 * @param {string} sourceID - the id of the source canvas
 * @param {string} destID - the id of the destination canvas
 * @param {array} newViewports - an array of javascript functions calculating the new viewport (see api doc for more details)
 * @param {array} newPredicates - an array of javascript functions calculating predicates for the new canvas
 * @constructor
 */
function Jump(sourceId, destId, newViewports, newPredicates) {

    this.sourceId = sourceId;
    this.destId = destId;
    this.newViewports = newViewports;
    this.newPredicates = newPredicates;
};


// exports
module.exports = {
    Jump : Jump
};
