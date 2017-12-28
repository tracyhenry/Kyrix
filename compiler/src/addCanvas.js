/**
 * Constructor for a canvas.
 * @param {string} id - id of the canvas.
 * @param {string} query - a SQL query. This query extracts the raw data this canvas is based on.
 * @param {function} placement - a javascript function calculating the placement of objects. See spec api for more details.
 * @param {function} transform - a javascript function calculating data transforms on raw data.
 * @param {function} rendering - a javascript function that produces an svg. Its input includes viewport position, the results of the placement and data transform functions. See spec api for more details.
 * @param {boolean} separable - whether the calculation of placement and transform is per-tuple based. If yes, the input to the placement and transform is a single tuple. Otherwise their input is the whole query result.
 * @constructor
 */
function Canvas(id, w, h, query, placement, transform, rendering, separable) {
    // assign fields
    this.id = String(id);
    this.w = w;
    this.h = h;
    this.query = String(query);
    this.placement = placement;
    this.transform = transform;
    this.rendering = rendering;
    this.separable = separable;
}

/**
 * Add a canvas to a project. Same arguments as the canvas constructor
 */
function addCanvas(id, w, h, query, placement, transform, rendering, separable) {
    // type check
    if (typeof w !== "number")
        throw new Error("Adding canvas: w must be an integer.");
    if (typeof h !== "number")
        throw new Error("Adding canvas: h must be an integer.");
    if (typeof placement !== "function")
        throw new Error("Adding canvas: placement must be a javascript function.");
    if (typeof transform !== "function")
        throw new Error("Adding canvas: transform must be a javascript function.");
    if (typeof rendering !== "function")
        throw new Error("Adding canvas: rendering must be a javascript function.");
    if (typeof separable !== "boolean")
        throw new Error("Adding canvas: separable must be boolean.");

    // check whether id is used
    for (var i = 0; i < this.canvases.length; i ++)
        if (this.canvases[i].id === id)
            throw new Error("Adding canvas: id " + id + " already existed.");

    // construct a new canvas
    var canvas = new Canvas(id, w, h, query, placement, transform, rendering, separable);

    // add this canvas to the canvas array
    this.canvases.push(canvas);
}


// exports
module.exports = {
    addCanvas : addCanvas
};
