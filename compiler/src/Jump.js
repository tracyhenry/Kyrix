/**
 * Construct jump transition between two canvases
 * @param {object} sourceCanvas - the source canvas object
 * @param {object} destCanvas - the destination canvas object
 * @param {object} optional - a dictionary of optional arguments, including zoom type, selector, predicate, viewport and name functions.
 * @constructor
 */
function Jump(sourceCanvas, destCanvas, type, optional) {

    if (optional == null)
        optional = {};
    // check canvas objects have ids
    if (sourceCanvas.id == null || destCanvas.id == null)
        throw new Error("Constructing Jump: unidentified source or destination canvas.");
    if (type == null)
        throw new Error("Constructing Jump: jump type is missing.");

    this.type = type;
    this.sourceId = sourceCanvas.id;
    this.destId = destCanvas.id;
    this.selector = ("selector" in optional ? optional["selector"] : "");
    this.newViewports = ("viewport" in optional ? optional["viewport"] : "");
    this.newPredicates = ("predicates" in optional ? optional["predicates"] : "");
    this.name = ("name" in optional ? optional["name"] : destCanvas.id);
};

// exports
module.exports = {
    Jump : Jump
};
