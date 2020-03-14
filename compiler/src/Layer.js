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
    this.fetchingScheme = "dbox";
    this.deltaBox = true;
    this.indexerType = "";
    this.autoDDId = "";
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
 * @param tooltipColumns - an array of column names to be displayed in the tooltip
 * @param tooltipAliases - an array of aliases to tooltipColumns
 */
function addRenderingFunc(rendering, tooltipColumns, tooltipAliases) {
    if (typeof rendering !== "function")
        throw new Error(
            "Constructing Layer: rendering must be a javascript function."
        );

    this.rendering = rendering;
    this.tooltipColumns = tooltipColumns == null ? [] : tooltipColumns;
    this.tooltipAliases =
        tooltipAliases == null ? tooltipColumns : tooltipAliases;
}

function setFetchingScheme(fetchingScheme, deltaBox) {
    if (this.isStatic)
        throw new Error(
            "Constructing Layer: static layer does not need fetching scheme."
        );
    if (fetchingScheme != "dbox" && fetchingScheme != "tiling")
        throw new Error("Constructing Layer: unrecognized fetching scheme.");
    this.fetchingScheme = fetchingScheme;
    this.deltaBox = deltaBox ? true : false;
}

/**
 * set autoDD ID
 * @param autoDDId
 */
function setAutoDDId(autoDDId) {
    this.autoDDId = autoDDId;
}

/**
 * set indexer, which tells the backend that which indexer this layer should use
 * @param indexer
 */
function setIndexerType(indexerType) {
    if (typeof indexerType !== "string")
        throw new Error(
            "Constructing Layer: the type of an indexer must be a string!"
        );
    this.indexerType = indexerType;
}

// define prototype
Layer.prototype = {
    addPlacement,
    addRenderingFunc,
    setFetchingScheme,
    setAutoDDId,
    setIndexerType
};

// exports
module.exports = {
    Layer
};
