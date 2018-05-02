/**
 * Constructor for a canvas.
 * @param {string} id - id of the canvas.
 * @param {int} w - width of the canvas.
 * @param {int} h - height of the canvas.
 * @constructor
 */
function Canvas(id, w, h) {

    // type check
    if (typeof w !== "number" || w <= 0)
        throw new Error("Constructing canvas: w must be a positive integer.");
    if (typeof h !== "number" || h <= 0)
        throw new Error("Constructing canvas: h must be a positive integer.");

    // assign fields
    this.id = String(id);
    this.w = w;
    this.h = h;
    this.transforms = []; // an initially empty transform array
    this.layers = [];   // an initially empty layer array
    this.zoomInFactor = 0;  // greater than 1 to be valid
    this.zoomOutFactor = 100;   // smaller than 1 to be valid
    this.axes = "";
};

// add layer to a canvas
function addLayer(layer) {

    var exist = false;
    for (var i = 0; i < this.transforms.length; i ++)
        if (this.transforms[i].id == layer.transformId)
            exist = true;

    if (! exist)
        throw new Error("Adding layer: transform ID " + layer.transformId + " does not exist.");

    this.layers.push(layer);
};

// add a transform object
function addTransform(transform) {

    this.transforms.push(transform);
};

// add an axis function
function addAxes(axesFunc) {
    this.axes = axesFunc;
};

// add functions to prototype
Canvas.prototype.addLayer = addLayer;
Canvas.prototype.addTransform = addTransform;
Canvas.prototype.addAxes = addAxes;

// exports
module.exports = {
    Canvas: Canvas
};
