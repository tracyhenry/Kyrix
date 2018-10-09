/**
 * Construct jump transition between two canvases
 * @param {object} sourceCanvas - the source canvas object
 * @param {object} destCanvas - the destination canvas object
 * @param {function} selector - a javascript function deciding whether a tuple should trigger this jump
 * @param {function} newViewports - a javascript function calculating the new viewport (see api doc for more details)
 * @param {function} newPredicates - a javascript function calculating predicates for the new canvas
 * @param {string} type - a string indicating the type of this jump, could be one of "literal_zoom_in", "literal_zoom_out", "semantic_zoom" or "geometric_semantic_zoom (or maybe something else in the future)
 * @param {string}/{function} name - the name of this jump, could be a string, or a function taking the jumping entity as input and returning the name.
 * @constructor
 */
function Jump(sourceCanvas, destCanvas, selector, newViewports, newPredicates, type, name) {

    // check canvas objects have ids
    if (sourceCanvas.id == null || destCanvas.id == null)
        throw new Error("Constructing Jump: unidentified source or destination canvas.");

    this.sourceId = sourceCanvas.id;
    this.destId = destCanvas.id;
    this.selector = selector;
    this.newViewports = newViewports;
    this.newPredicates = newPredicates;
    this.type = type;
    if (name != null)
        this.name = name;
    else
        this.name = destCanvas.id;
};

// exports
module.exports = {
    Jump : Jump
};
