/**
 * Layer existing canvases in the project.
 * @param {array} ids - an array containing ids of the canvases to be layered, from top to bottom.
 */
function layerCanvases(ids) {
    // argument checks
    for (var i = 0; i < ids.length; i ++) {
        var id = ids[i];

        // check whether id corresponds to an existing canvas
        var exist = false;
        for (var j = 0; j < this.canvases.length; j ++)
            if (this.canvases[j].id === id)
                exist = true;
        if (! exist)
            throw new Error("Layering canvases: id " + id + " does not exist.");

        // check whether id got layered already
        exist = false;
        for (var j = 0; j < this.layeredCanvases.length; j ++)
            for (var k = 0; k < this.layeredCanvases[j].length; k ++)
                if (this.layeredCanvases[j][k] === id)
                    throw new Error("Layering canvases: canvas " + id + " got layered already.");
    }

    // add to the project
    this.layeredCanvases.push(ids);
}


// exports
module.exports = {
    layerCanvases : layerCanvases
};
