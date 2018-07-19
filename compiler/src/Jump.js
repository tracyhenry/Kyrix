/**
 * Construct jump transition between two canvases
 * @param {string} sourceID - the id of the source canvas
 * @param {string} destID - the id of the destination canvas
 * @param {function} selector - a javascript function deciding whether a tuple should trigger this jump
 * @param {function} newViewports - a javascript function calculating the new viewport (see api doc for more details)
 * @param {function} newPredicates - a javascript function calculating predicates for the new canvas
 * @param {string} type - a string indicating the type of this jump, could be one of "literal_zoom_in", "literal_zoom_out", "semantic_zoom" or "geometric_semantic_zoom (or maybe something else in the future)
 * @param {string}/{function} name - the name of this jump, could be a string, or a function taking the jumping entity as input and returning the name.
 * @constructor
 */
function Jump(sourceId, destId, selector, newViewports, newPredicates, type, name) {

    this.sourceId = sourceId;
    this.destId = destId;
    this.selector = selector;
    this.newViewports = newViewports;
    this.newPredicates = newPredicates;
    this.type = type;
    if (name != null)
        this.name = name;
    else
        this.name = destId;
};

// exports
module.exports = {
    Jump : Jump
};
