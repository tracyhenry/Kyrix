/**
 * Set the initial canvas and viewport for a project
 * @param {string} id - the id of the canvas
 * @param {number} viewportX - x coordinate of the initial viewport (top left)
 * @param {number} viewportY - y coordinate of the initial viewport (top left)
 */
function initialCanvas(id, viewportX, viewportY) {
    // check if this id exists
    var exist = false;
    for (var i = 0; i < this.canvases.length; i ++)
        if (this.canvases[i].id === id)
            exist = true;
    if (! exist)
        throw new Error("Initial canvas: canvas " + id + " does not exist.");

    // check viewport range
    if (viewportX < 0 || viewportX > this.viewportWidth)
        throw new Error("Initial canvas: viewportX out of range.");
    if (viewportY < 0 || viewportY > this.viewportHeight)
        throw new Error("Initial canvas: viewportY out of range.");

    // assign fields
    this.initialCanvasId = id;
    this.initialViewportX = viewportX;
    this.initialViewportY = viewportY;
}


module.exports = {
  initialCanvas : initialCanvas
};
