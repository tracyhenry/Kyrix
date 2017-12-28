// imports
const fs = require("fs");
const addCanvas = require("./addCanvas");
const layerCanvases = require("./layerCanvases");
const saveToDB = require("./saveToDB");

/**
 *
 * @param {string} name - project name.
 * @param {string} dbFile - a configuration file for the database this project is associated with. This file contains a json blob specifying the host, user, and password of the database (see dbconfig.example for an example). NEVER check this file into the repo. 'dbconfig.txt' is added to gitignore, so it'll be convenient to name it as 'dbconfig.txt'. Note that if relative path is used, the path is relative to the directory the Kyrix spec is run in.
 * @param {number} viewportWidth - the width of the viewport, in pixels.
 * @param {number} viewportHeight - the height of the viewport, in pixels.
 * @constructor
 */
function Project(name, dbFile, viewportWidth, viewportHeight) {
    // name
    this.name = name;

    // db configs
    this.dbConfig = JSON.parse(fs.readFileSync(dbFile));

    // viewport
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    // the set of canvases
    this.canvases = [];

    // the set of layered canvases
    this.layeredCanvases = [];

    // initial viewport, canvas
    this.initialCanvasID = "";
    this.initialViewportX = 0;
    this.initialViewportY = 0;
}

// define prototype functions
Project.prototype = {
    addCanvas : addCanvas.addCanvas,
    layerCanvases : layerCanvases.layerCanvases
};

// exports
module.exports = {
    Project : Project
};
