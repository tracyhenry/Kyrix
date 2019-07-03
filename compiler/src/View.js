/**
 * Construct a view object
 * @param viewId - identifier of this view
 * @param minx - the minimum x coordinate of the this view inside the view coordinate system
 * @param miny - the minimum y coordinate of the this view inside the view coordinate system
 * @param width - width of this view
 * @param height - height of this view
 * @constructor
 */
function View(viewId, minx, miny, width, height) {
    if (viewId == null) throw new Error("Constructing View: invalid view Id");
    if (minx == null || minx < 0)
        throw new Error("Constructing View: invalid minx.");
    if (minx == null || miny < 0)
        throw new Error("Constructing View: invalid miny.");
    if (width == null || width <= 0)
        throw new Error("Constructing View: invalid width.");
    if (height == null || height <= 0)
        throw new Error("Constructing View: invalid height.");

    this.id = viewId;
    this.minx = minx;
    this.miny = miny;
    this.width = width;
    this.height = height;
    this.initialCanvasId = "";
    this.initialViewportX = -1;
    this.initialViewportY = -1;
    this.initialPredicates = "{}";
}

// exports
module.exports = {
    View: View
};
