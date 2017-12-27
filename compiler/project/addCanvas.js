/**
 * Add a canvas to a project.
 * @param canvas - the canvas to be added
 */
function addCanvas(canvas)
{
    this.canvases.push(canvas);
}

/**
 * Add a layered canvas to a project.
 * @param layeredCanvas
 */
function addLayeredCanvas(layeredCanvas)
{
    this.layeredCanvases.push(layeredCanvas);
}

// exports
module.exports = {
    addCanvas : addCanvas,
    addLayeredCanvas : addLayeredCanvas
};
