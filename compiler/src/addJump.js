/**
 * Construct jump transition between two canvases
 * @param {string} sourceID - the id of the source canvas
 * @param {string} destID - the id of the destination canvas
 * @param {function} newViewport - a javascript function calculating the new viewport (see api doc for more details)
 * @param {function} newPredicate - a javascript function calculating a new predicate (see api doc for more details)
 * @constructor
 */
function Jump(sourceId, destId, newViewport, newPredicate) {
    this.sourceId = sourceId;
    this.destId = destId;
    this.newViewport = newViewport;
    this.newPredicate = newPredicate;
}

/**
 * Add a Jump to a project. Same arguments as the Jump constructor
 */

function addJump(sourceId, destId, newViewport, newPredicate) {
    // type check
    if (typeof newViewport !== "function")
        throw new Error("Adding Jump: newViewport must be a function.");
    if (typeof newPredicate !== "function")
        throw new Error("Adding Jump: newPredicate must be a function.");

    // check whether sourceID exists
    var exist = false;
    for (var i = 0; i < this.canvases.length; i ++)
        if (this.canvases[i].id === sourceId)
            exist = true;
    if (! exist)
        throw new Error("Adding Jump: canvas " + sourceId + " does not exist.");
    exist = false;
    for (var i = 0; i < this.canvases.length; i ++)
        if (this.canvases[i].id === destId)
            exist = true;
    if (! exist)
        throw new Error("Adding Jump: canvas " + destId + " does not exist.");

    // construct a new Jump
    var jump = new Jump(sourceId, destId, newViewport, newPredicate);

    // add to the jump array
    this.jumps.push(jump);
}


// exports
module.exports = {
    addJump : addJump
}