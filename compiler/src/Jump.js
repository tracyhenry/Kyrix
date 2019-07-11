/**
 * Construct jump transition between two canvases
 * @param {object} sourceCanvas - the source canvas object
 * @param {object} destCanvas - the destination canvas object
 * @param {object} optional - a dictionary of optional arguments, including zoom type, selector, predicate, viewport and name functions.
 * @constructor
 */
function Jump(sourceCanvas, destCanvas, type, optional) {
    // check must-have fields
    if (sourceCanvas.id == null || destCanvas.id == null)
        throw new Error(
            "Constructing Jump: unidentified source or destination canvas."
        );
    if (type == null) throw new Error("Constructing Jump: missing jump type.");
    if (
        (type == "literal_zoom_in" || type == "literal_zoom_out") &&
        optional != null
    )
        throw new Error(
            "Constructing Jump: literal zooms do not need optional arguments."
        );
    if (optional == null) optional = {};
    if (
        type == "semantic_zoom" ||
        type == "geometric_semantic_zoom" ||
        type == "load"
    )
        if (
            !("selector" in optional) ||
            !("viewport" in optional) ||
            !("predicates" in optional)
        )
            throw new Error(
                "Constructing Jump: missing customization functions for semantic zoom and load."
            );
    if (type == "load" || type == "highlight")
        if (!("sourceView" in optional) || !("destView" in optional))
            throw new Error(
                "Constructing Jump: missing view objects for load/highlight."
            );
    if (type == "highlight")
        if (!("selector" in optional) || !("predicates" in optional))
            throw new Error(
                "Constructing Jump: missing customization functions for highlight."
            );

    this.type = type;
    this.sourceId = sourceCanvas.id;
    this.destId = destCanvas.id;
    this.selector = "selector" in optional ? optional.selector : "";
    this.viewport = "viewport" in optional ? optional.viewport : "";
    this.predicates = "predicates" in optional ? optional.predicates : "";
    this.name = "name" in optional ? optional.name : destCanvas.id;
    this.sourceViewId = "sourceView" in optional ? optional.sourceView.id : "";
    this.destViewId = "destView" in optional ? optional.destView.id : "";
    this.noPrefix = "noPrefix" in optional ? optional.noPrefix : false;
}

// exports
module.exports = {
    Jump: Jump
};
