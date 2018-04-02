/**
 * Constructor for a layer object.
 * @param transformId - the id of the data transform that this layer is using.
 * @constructor
 */
function Layer(transformId) {
    this.transformId = transformId;
};


/**
 * add a placement object to a layer object
 * @param placement - an object containing functions that calculate the placement of objects. See spec api for more details.
 */
function addPlacement(placement) {

    if (! ('centroid_x' in placement) ||
        ! ('centroid_y' in placement) ||
        ! ('width' in placement) ||
        ! ('height' in placement) ||
        typeof placement.centroid_x !== "function" ||
        typeof placement.centroid_y !== "function" ||
        typeof placement.width !== "function" ||
        typeof placement.height !== "function")
        throw new Error("Constructing Layer: malformed placement object.");

    this.placement = placement;
};

/**
 * add a rendering function to a layer object
 * @param rendering - a javascript function that adds an <g> element to an existing svg. See spec api for details on input/output.
 */
function addRenderingFunc(rendering) {

    if (typeof rendering !== "function")
        throw new Error("Constructing Layer: rendering must be a javascript function.");

    this.rendering = rendering;
};

// define prototype
Layer.prototype = {
    addPlacement: addPlacement,
    addRenderingFunc: addRenderingFunc
};

// exports
module.exports = {
    Layer: Layer
};
