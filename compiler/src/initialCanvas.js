/**
 * Set the initial canvas and viewport for a project
 * @param {string} id - the id of the canvas
 * @param {number} viewportX - x coordinate of the initial viewport (top left)
 * @param {number} viewportY - y coordinate of the initial viewport (top left)
 */
function initialCanvas(id, viewportX, viewportY) {
    this.initialCanvasId = id;
    this.initialViewportX = viewportX;
    this.initialViewportY = viewportY;
}