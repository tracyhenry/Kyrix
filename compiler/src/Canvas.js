/**
 * Constructor for a canvas.
 * @param {string} id - id of the canvas.
 * @param {int} w - width of the canvas.
 * @param {int} h - height of the canvas.
 * @constructor
 */
function Canvas(id, w, h) {

    // type check
    if (typeof w !== "number")
        throw new Error("Constructing canvas: w must be an integer.");
    if (typeof h !== "number")
        throw new Error("Constructing canvas: h must be an integer.");

    // assign fields
    this.id = String(id);
    this.w = w;
    this.h = h;
    this.transforms = []; // an initially empty transform array
    this.layers = [];   // an initially empty layer array
};

// add layer to a canvas
function addLayer(layer) {

    var exist = false;
    for (var i = 0; i < this.transforms.length; i ++)
        if (this.transforms[i].id == layer.transformId)
            exist=  true;
    if (! exist)
        throw new Error("Adding layer: transform ID " + layer.transformId + " does not exist.");

    this.layers.push(layer);
};

// add a transform object
function addTransform(transform) {

    this.transforms.push(transform);
};

// add it to prototype
Canvas.prototype.addLayer = addLayer;
Canvas.prototype.addTransform = addTransform;

// exports
module.exports = {
    Canvas: Canvas
};
