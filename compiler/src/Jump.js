/**
 * Construct jump transition between two canvases
 * @param {string} sourceID - the id of the source canvas
 * @param {string} destID - the id of the destination canvas
 * @param {function} newViewport - a javascript function calculating the new viewport (see api doc for more details)
 * @constructor
 */
function Jump(sourceId, destId, newViewport) {

    // type check
    if (typeof newViewport !== "function")
        throw new Error("Constructing Jump: newViewport must be a function.");

    this.sourceId = sourceId;
    this.destId = destId;
    this.newViewport = newViewport;
};


// exports
module.exports = {
    Jump : Jump
};
