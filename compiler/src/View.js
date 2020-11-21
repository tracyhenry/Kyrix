/**
 * Construct a view object
 * @param viewId - identifier of this view
 * @param width - width of this view
 * @param height - height of this view
 * @constructor
 */
function View(viewId, width, height) {
    if (viewId == null) throw new Error("Constructing View: invalid view Id");
    if (width == null || width <= 0)
        throw new Error("Constructing View: invalid width.");
    if (height == null || height <= 0)
        throw new Error("Constructing View: invalid height.");

    this.id = viewId;
    this.width = width;
    this.height = height;
    this.initialCanvasId = "";
    this.initialViewportX = -1;
    this.initialViewportY = -1;
    this.initialPredicates = "{}";
}

// exports
module.exports = {
    View
};
