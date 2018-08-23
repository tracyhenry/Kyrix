// imports
const fs = require("fs");
const mysql = require("mysql");
const psql = require("pg");
const http = require("http");
const Canvas = require("./Canvas").Canvas;
const Jump = require("./Jump").Jump;
const Layer = require("./Layer").Layer;
const Transform = require("./Transform").Transform;

/**
 *
 * @param {string} name - project name.
 * @param {string} configFile - a configuration file for this project. This file contains six lines which are documented in README.md in the root folder. See dbconfig.example for an example. NEVER check this file into the repo. 'config.txt' is added to gitignore, so it'll be convenient to just name it as 'config.txt'. Note that if relative path is used, the path is relative to the directory the Kyrix spec is run in.
 * @param {number} viewportWidth - the width of the viewport, in pixels.
 * @param {number} viewportHeight - the height of the viewport, in pixels.
 * @constructor
 */
function Project(name, configFile, viewportWidth, viewportHeight) {

    // name
    this.name = name;

    // configurations
    var lines = fs.readFileSync(configFile).toString().split("\n");
    this.config = {};
    this.config.serverPortNumber = lines[1].replace('\r', '');
    this.config.database = lines[2].replace('\r', '').toLowerCase();
    this.config.serverName = lines[3].replace('\r', '');
    this.config.userName = lines[4].replace('\r', '');
    this.config.password = lines[5].replace('\r', '');
    this.config.kyrixDbName = lines[6].replace('\r', '');

    // viewport
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    // the set of canvases
    this.canvases = [];

    // the set of jump transitions
    this.jumps = [];

    // initial viewport, canvas, rendering parameters
    this.initialCanvasId = "";
    this.initialViewportX = 0;
    this.initialViewportY = 0;
    this.renderingParams = "{}";
}

/**
 * Add a canvas to a project.
 */
function addCanvas(canvas) {

    // check whether id is used
    for (var i = 0; i < this.canvases.length; i ++)
        if (this.canvases[i].id == canvas.id)
            throw new Error("Constructing canvas: id " + canvas.id + " already existed.");

    // add this canvas to the canvas array
    this.canvases.push(canvas);
}

/**
 * Add a Jump to a project.
 */
function addJump(jump) {

    var sourceCanvas = null, destCanvas = null;
    // check whether sourceID exists
    for (var i = 0; i < this.canvases.length; i ++)
        if (this.canvases[i].id === jump.sourceId)
            sourceCanvas = this.canvases[i];
    if (sourceCanvas == null)
        throw new Error("Constructing Jump: canvas " + jump.sourceId + " does not exist.");

    // check whether destId exists
    for (var i = 0; i < this.canvases.length; i ++)
        if (this.canvases[i].id === jump.destId)
            destCanvas = this.canvases[i];
    if (destCanvas == null)
        throw new Error("Constructing Jump: canvas " + jump.destId + " does not exist.");

    // deal with literal zooms
    if (jump.type == "literal_zoom_in" || jump.type == "literal_zoom_out") {
        // check duplicates
        for (var i = 0; i < this.jumps.length; i ++)
            if (this.jumps[i].sourceId == jump.sourceId
                && this.jumps[i].type == jump.type)
                throw new Error("Constructing jump: there can be only one " + jump.type + " for a canvas.");

        // check if w and h is pre-decided
        if (sourceCanvas.w <= 0 || sourceCanvas.h <= 0
            || destCanvas.w <= 0 || destCanvas.h <= 0)
            throw new Error("Constructing jump: canvases with literal zooms must have predetermined width and height.");

        // check whether zoom factor is the same for x & y
        if (destCanvas.w != sourceCanvas.w &&
            destCanvas.h != sourceCanvas.h &&
            destCanvas.w / sourceCanvas.w != destCanvas.h / sourceCanvas.h)
            throw new Error("Constructing jump: cannot infer literal zoom factor.");

        // assign zoom factor to the source canvas
        if (jump.type == "literal_zoom_in") {
            sourceCanvas.zoomInFactorX = destCanvas.w / sourceCanvas.w;
            sourceCanvas.zoomInFactorY = destCanvas.h / sourceCanvas.h;
            if (sourceCanvas.zoomInFactorX <= 1 && sourceCanvas.zoomInFactorY <= 1)
                throw new Error("Constructing jump: zoom in factor should be greater than 1.");
        }
        else {
            sourceCanvas.zoomOutFactorX = destCanvas.w / sourceCanvas.w;
            sourceCanvas.zoomOutFactorY = destCanvas.h / sourceCanvas.h;
            if (sourceCanvas.zoomOutFactorX >= 1 && sourceCanvas.zoomOutFactorY >= 1)
                throw new Error("Constructing jump: zoom out factor shoulde be smaller than 1.");
        }
    }

    this.jumps.push(jump);
}

// add a rendering parameter object
function addRenderingParams(renderingParams) {

    this.renderingParams = JSON.stringify(renderingParams, function (key, value) {
        if (typeof value === 'function')
            return value.toString();
        return value;
    });
}

/**
 * Set the initial canvas and viewport for a project
 * @param {string} id - the id of the canvas
 * @param {number} viewportX - x coordinate of the initial viewport (top left)
 * @param {number} viewportY - y coordinate of the initial viewport (top left)
 * @param {array} predicates - the initial predicates to be added to the sql query of data transforms
 */
function initialCanvas(id, viewportX, viewportY, predicates) {

    // check if this id exists
    var canvasId = -1;
    for (var i = 0; i < this.canvases.length; i ++)
        if (this.canvases[i].id === id)
            canvasId = i;
    if (canvasId == -1)
        throw new Error("Initial canvas: canvas " + id + " does not exist.");

    // check viewport range
    if (viewportX < 0 || viewportX + this.viewportWidth > this.canvases[canvasId].w)
        throw new Error("Initial canvas: viewportX out of range.");
    if (viewportY < 0 || viewportY + this.viewportHeight > this.canvases[canvasId].h)
        throw new Error("Initial canvas: viewportY out of range.");

    // check if the size of the predicates array equals the number of layers
    if (predicates == null) {
        predicates = [];
        for (var i = 0; i < this.canvases[canvasId].layers.length; i ++)
            predicates.push("");
    }
    if (predicates.length != this.canvases[canvasId].layers.length)
        throw new Error("Initial canvas: # predicates does not equal # layers.");

    // assign fields
    this.initialCanvasId = id;
    this.initialViewportX = viewportX;
    this.initialViewportY = viewportY;
    this.initialPredicates = predicates;
}

function sendProjectRequestToBackend(portNumber, projectJSON) {

    // set up http post connections
    var post_options = {
        host: "localhost",
        port: portNumber,
        path: '/project',
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    };
    console.log(post_options);
    var post_req = http.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('Response: ' + chunk);
        });
    });

    // send the project definition to tile server
    post_req.write(projectJSON);
    post_req.end();
}

// save the current project, and send it to backend server
function saveProject()
{
    // final checks before saving
    for (var i = 0; i < this.canvases.length; i ++) {
        if (this.canvases[i].layers.length == 0)
            throw new Error("Canvas " + this.canvases[i].id + " has 0 layers.");
        for (var j = 0; j < this.canvases[i].layers.length; j ++)
            if (this.canvases[i].layers[j].isStatic && this.canvases[i].layers[j].placement != null)
                throw new Error("Canvas " + this.canvases[i] + " layer " + j + " is static and does not need a placement object.");
    }

    // prepare project definition JSON strings
    var projectJSON = JSON.stringify(this, function (key, value) {
        if (typeof value === 'function')
            return value.toString();
        return value;
    });
    var logJSON = JSON.stringify(this, function (key, value) {
        if (typeof value === 'function')
            return value.toString();
        return value;
    }, 4);
    //console.log(logJSON);

    // add escape character to projectJSON
    var projectJSONEscapedMySQL = (projectJSON + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
    var projectJSONEscapedPSQL = projectJSON.replace(/\'/g, '\'\'');

    // construct queries
    var createTableQuery = "CREATE TABLE project (name VARCHAR(255), content TEXT, dirty int" +
        ", CONSTRAINT PK_project PRIMARY KEY (name));";
    var deleteProjQuery = "DELETE FROM project where name = \'" + this.name + "\'";
    var insertProjQueryMySQL = "INSERT INTO project (name, content, dirty) VALUES (\'" +
        this.name + "\', \'" + projectJSONEscapedMySQL + "\', 1);";
    var insertProjQueryPSQL = "INSERT INTO project (name, content, dirty) VALUES (\'" +
        this.name + "\', \'" + projectJSONEscapedPSQL + "\', 1);";

    // connect to databases
    var config = this.config;
    if (config.database == "mysql") {

        var createDbQuery = "CREATE DATABASE " + config.kyrixDbName;
        var useDbQuery = "USE " + config.kyrixDbName + ";";

        var dbConn = mysql.createConnection({
            host: config.serverName,
            user: config.userName,
            password: config.password,
            insecureAuth: true
        });

        // create the database 'Kyrix' and ignore the error
        dbConn.query(createDbQuery, function (err) {});

        // use db
        dbConn.query(useDbQuery, function (err) {if (err) throw err;});

        // create a table and ignore the error
        dbConn.query(createTableQuery, function (err) {});

        // delete the project definition and ignore the error
        dbConn.query(deleteProjQuery, function (err) {});

        // insert the project definition
        dbConn.query(insertProjQueryMySQL, function (err) {
            if (err) throw err;
            sendProjectRequestToBackend(config.serverPortNumber, projectJSON);
        });

        // end connection
        dbConn.end();
    }
    else if (config.database == "psql") {

        var createDbQuery = "CREATE DATABASE \"" + config.kyrixDbName + "\"";
        var useDbQuery = "USE \"" + config.kyrixDbName + "\";";

        // construct a connection to the postgres db to create Kyrix db
        var postgresConn = new psql.Client({host : config.serverName,
            user : config.userName,
            password : config.password,
            database : "postgres"});

        // create Kyrix DB and ignore error
        postgresConn.connect(function (err) {
            postgresConn.query(createDbQuery, function (err) {

                var dbConn = new psql.Client({host : config.serverName,
                    user : config.userName,
                    password : config.password,
                    database : config.kyrixDbName});

                // connect and pose queries
                dbConn.connect(function(err) {

                    // log to console
                    if (err)
                        console.error('connection error', err.stack);
                    else
                        console.log('connected');

                    if (err) throw err;

                    // create a table and ignore the error
                    dbConn.query(createTableQuery, function (err) {

                        // delete the project if exists
                        dbConn.query(deleteProjQuery, function (err) {

                            // insert the JSON blob into the project table
                            dbConn.query(insertProjQueryPSQL,
                                function (err) {
                                    if (err) throw err;
                                    sendProjectRequestToBackend(config.serverPortNumber, projectJSON);
                                    dbConn.end();
                                    postgresConn.end();
                                });
                        });
                    });
                });
            });
        });
    }
}

// define prototype functions
Project.prototype = {
    addCanvas: addCanvas,
    addJump: addJump,
    initialCanvas: initialCanvas,
    saveProject: saveProject,
    addRenderingParams : addRenderingParams
};

// exports
module.exports = {
    Project : Project,
    Canvas : Canvas,
    Jump : Jump,
    Layer : Layer,
    Transform : Transform
};
