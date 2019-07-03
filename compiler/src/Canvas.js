/**
 * Constructor for a canvas.
 * @param {string} id - id of the canvas.
 * @param {int} w - width of the canvas.
 * @param {int} h - height of the canvas.
 * @constructor
 */
function Canvas(id, w, h, wString, hString) {
    // type check
    if (typeof w != "number" || w < 0 || (w == 0 && wString == ""))
        throw new Error("Constructing canvas: w must be a positive integer.");
    if (typeof h != "number" || h < 0 || (h == 0 && hString == ""))
        throw new Error("Constructing canvas: h must be a positive integer.");
    if (w == 0) {
        wString = processWidthHeightString(wString);
        this.w = -1;
        this.wLayerId = wString.split(":")[0];
        this.wSql = wString.substring(this.wLayerId.length + 1);
    } else {
        this.w = w;
        this.wSql = "";
        this.wLayerId = "";
    }

    if (h == 0) {
        hString = processWidthHeightString(hString);
        this.h = -1;
        this.hLayerId = hString.split(":")[0];
        this.hSql = hString.substring(this.hLayerId.length + 1);
    } else {
        this.h = h;
        this.hSql = "";
        this.hLayerId = "";
    }

    // assign fields
    this.id = String(id);
    this.layers = []; // an initially empty layer array
    this.zoomInFactorX = 0; // greater than 1 to be valid
    this.zoomInFactorY = 0; // greater than 1 to be valid
    this.zoomOutFactorX = 100; // smaller than 1 to be valid
    this.zoomOutFactorY = 100; // smaller than 1 to be valid
    this.axes = "";
}

// add layer to a canvas
function addLayer(layer) {
    this.layers.push(layer);
}

// add an axis function
function addAxes(axesFunc) {
    this.axes = axesFunc;
}

// width/height string processing
function processWidthHeightString(s) {
    s = s.toLowerCase();
    while (s.slice(-1) == " " || s.slice(-1) == ";") s = s.slice(0, -1);
    if (s.indexOf("where") == -1) s = s + " where 1 = 1";
    return s;
}

// add functions to prototype
Canvas.prototype.addLayer = addLayer;
Canvas.prototype.addAxes = addAxes;

// exports
module.exports = {
    Canvas: Canvas
};
