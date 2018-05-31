/**
 * Constructor for a layer object.
 * @param transformId - the id of the data transform that this layer is using.
 * @constructor
 */
function Layer(transformId, isStatic) {
    this.transformId = transformId;
    if (isStatic == null)
        this.isStatic = false;
    else
        this.isStatic = isStatic;
};

/**
 * add a placement object to a layer object
 * @param placement - an object containing strings that represent either a column or a constant. See spec api for more details.
 */
function addPlacement(placement) {

    if (! ('centroid_x' in placement) ||
        ! ('centroid_y' in placement) ||
        ! ('width' in placement) ||
        ! ('height' in placement))
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
