const emptyTransform = require("./Transform").defaultEmptyTransform;

/**
 * Constructor for a layer object.
 * @param transform - the data transform object that this layer is using.
 * @constructor
 */
function Layer(transform, isStatic) {
    // get a default empty transform if transform is null
    if (transform == null) {
        if (!isStatic)
            throw new Error(
                "Constructing Layer: a dynamic layer must have a non-null data transform."
            );
        transform = emptyTransform;
    }

    this.transform = transform;
    if (isStatic == null) this.isStatic = false;
    else this.isStatic = isStatic;
    this.isAutoDDLayer = false;
    this.retainSizeZoom = false;
}

/**
 * add a placement object to a layer object
 * @param placement - an object containing strings that represent either a column or a constant. See spec api for more details.
 */
function addPlacement(placement) {
    if (
        !("centroid_x" in placement) ||
        !("centroid_y" in placement) ||
        !("width" in placement) ||
        !("height" in placement)
    )
        throw new Error("Constructing Layer: malformed placement object.");

    if (
        placement.centroid_x == "full" ||
        placement.centroid_y == "full" ||
        placement.width == "full" ||
        placement.height == "full"
    )
        placement.centroid_x = placement.centroid_y = placement.width = placement.height =
            "full";
    this.placement = placement;
}

/**
 * add a rendering function to a layer object
 * @param rendering - a javascript function that adds an <g> element to an existing svg. See spec api for details on input/output.
 */
function addRenderingFunc(rendering) {
    if (typeof rendering !== "function")
        throw new Error(
            "Constructing Layer: rendering must be a javascript function."
        );

    this.rendering = rendering;
}

/**
 * set isAutoDD, which tells the backend that this layer should use the autodd indexer
 * @param isAutoDD
 */
function setIsAutoDD(isAutoDD) {
    this.isAutoDDLayer = isAutoDD;
}

/**
 * set retainSizeZoom,
 * @param retainSizeZoom
 */
function setRetainSizeZoom(retainSizeZoom) {
    this.retainSizeZoom = retainSizeZoom;
}

// define prototype
Layer.prototype = {
    addPlacement: addPlacement,
    addRenderingFunc: addRenderingFunc,
    setIsAutoDD: setIsAutoDD,
    setRetainSizeZoom: setRetainSizeZoom
};

// exports
module.exports = {
    Layer: Layer
};
