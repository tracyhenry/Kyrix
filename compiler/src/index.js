// imports
const fs = require("fs");
const mysql = require("mysql");
const psql = require("pg");
const http = require("http");
const Canvas = require("./Canvas").Canvas;
const View = require("./View").View;
const Jump = require("./Jump").Jump;
const Layer = require("./Layer").Layer;
const Transform = require("./Transform").Transform;

/**
 *
 * @param {string} name - project name.
 * @param {string} configFile - a configuration file for this project. This file contains six lines which are documented in README.md in the root folder. See dbconfig.example for an example. NEVER check this file into the repo. 'config.txt' is added to gitignore, so it'll be convenient to just name it as 'config.txt'. Note that if relative path is used, the path is relative to the directory the Kyrix spec is run in.
 * @constructor
 */
function Project(name, configFile) {
    // name
    this.name = name;

    // configurations
    var lines = fs
        .readFileSync(configFile)
        .toString()
        .split("\n");
    this.config = {};
    this.config.serverPortNumber = lines[1].replace("\r", "");
    this.config.database = lines[2].replace("\r", "").toLowerCase();
    this.config.serverName = lines[3].replace("\r", "");
    this.config.userName = lines[4].replace("\r", "");
    this.config.password = lines[5].replace("\r", "");
    this.config.kyrixDbName = lines[6].replace("\r", "");

    // set of views
    this.views = [];

    // set of canvases
    this.canvases = [];

    // set of jump transitions
    this.jumps = [];

    // set of ssv(s)
    this.ssvs = [];

    // set of tables
    this.tables = [];

    // rendering parameters
    this.renderingParams = "{}";

    // style sheets
    this.styles = [];
}

// Add a view to a project.
function addView(view) {
    for (var i = 0; i < this.views.length; i++) {
        if (this.views[i].id == view.id)
            throw new Error("Adding View: view id already existed.");
        if (
            this.views[i].minx > view.minx + view.width ||
            this.views[i].miny > view.miny + view.height ||
            view.minx > this.views[i].minx + this.views[i].width ||
            view.miny > this.views[i].miny + this.views[i].height
        )
            continue;
        else
            throw new Error(
                "Adding View: this view intersects with an existing view."
            );
    }
    this.views.push(view);
}

// Add a canvas to a project.
function addCanvas(canvas) {
    // check whether id is used
    for (var i = 0; i < this.canvases.length; i++)
        if (this.canvases[i].id == canvas.id)
            throw new Error(
                "Constructing canvas: id " + canvas.id + " already existed."
            );

    // check whether canvas size is smaller than viewport size
    if (canvas.wSql == "" && canvas.w < this.viewportWidth)
        throw new Error(
            "Constructing canvas: " +
                canvas.id +
                " cannot have width smaller than viewport width."
        );
    if (canvas.hSql == "" && canvas.h < this.viewportHeight)
        throw new Error(
            "Constructing canvas: " +
                canvas.id +
                " cannot have height smaller than viewport height."
        );

    // add this canvas to the canvas array
    this.canvases.push(canvas);
}

// Add a Jump to a project.
function addJump(jump) {
    var sourceCanvas = null,
        destCanvas = null;
    // check whether sourceID exists
    for (var i = 0; i < this.canvases.length; i++)
        if (this.canvases[i].id === jump.sourceId)
            sourceCanvas = this.canvases[i];
    if (sourceCanvas == null)
        throw new Error(
            "Constructing Jump: canvas " + jump.sourceId + " does not exist."
        );

    // check whether destId exists
    for (var i = 0; i < this.canvases.length; i++)
        if (this.canvases[i].id === jump.destId) destCanvas = this.canvases[i];
    if (destCanvas == null)
        throw new Error(
            "Constructing Jump: canvas " + jump.destId + " does not exist."
        );

    // deal with literal zooms
    if (jump.type == "literal_zoom_in" || jump.type == "literal_zoom_out") {
        // check duplicates
        for (var i = 0; i < this.jumps.length; i++)
            if (
                this.jumps[i].sourceId == jump.sourceId &&
                this.jumps[i].type == jump.type
            )
                throw new Error(
                    "Constructing jump: there can be only one " +
                        jump.type +
                        " for a canvas."
                );

        // check if w and h is pre-decided
        if (
            sourceCanvas.w <= 0 ||
            sourceCanvas.h <= 0 ||
            destCanvas.w <= 0 ||
            destCanvas.h <= 0
        )
            throw new Error(
                "Constructing jump: canvases with literal zooms must have predetermined width and height."
            );

        // check whether zoom factor is the same for x & y
        if (
            destCanvas.w != sourceCanvas.w &&
            destCanvas.h != sourceCanvas.h &&
            Math.abs(
                destCanvas.w / sourceCanvas.w - destCanvas.h / sourceCanvas.h
            ) > 1e-3
        )
            throw new Error(
                "Constructing jump: cannot infer literal zoom factor."
            );

        // assign zoom factor to the source canvas
        if (jump.type == "literal_zoom_in") {
            sourceCanvas.zoomInFactorX = destCanvas.w / sourceCanvas.w;
            sourceCanvas.zoomInFactorY = destCanvas.h / sourceCanvas.h;
            if (
                sourceCanvas.zoomInFactorX <= 1 &&
                sourceCanvas.zoomInFactorY <= 1
            )
                throw new Error(
                    "Constructing jump: zoom in factor should be greater than 1."
                );
        } else {
            sourceCanvas.zoomOutFactorX = destCanvas.w / sourceCanvas.w;
            sourceCanvas.zoomOutFactorY = destCanvas.h / sourceCanvas.h;
            if (
                sourceCanvas.zoomOutFactorX >= 1 &&
                sourceCanvas.zoomOutFactorY >= 1
            )
                throw new Error(
                    "Constructing jump: zoom out factor shoulde be smaller than 1."
                );
        }
    }

    this.jumps.push(jump);
}

// Add a Tabular vis to a project
function addTable(table, args) {
    if (args == null) args = {};

    this.tables.push(table);
    table.name = "kyrix_table_" + (this.tables.length - 1);

    table.renderingParams = {
        [table.name]: {
            x: table.x,
            y: table.y,
            heads: {
                height: table.heads_height,
                names: table.heads_names
            },
            width: table.width,
            cell_height: table.cell_height,
            fields: table.schema.slice(0, table.schema.indexOf("rn"))
        }
    };

    var canvas = new Canvas(
        table.name,
        Math.ceil(table.sum_width),
        0,
        "",
        `0:select count(*) * ${table.cell_height} + ${table.heads_height} from ${table.table}`
    );
    this.addCanvas(canvas);
    this.addStyles(__dirname + "/template-api/css/table.css");
    this.addRenderingParams(table.renderingParams);
    var transform_func = table.getTableTransformFunc();
    var tableTransform = new Transform(
        table.query,
        table.db,
        transform_func,
        table.schema,
        true
    );

    var tableLayer = new Layer(tableTransform, false);
    tableLayer.addPlacement(table.placement);
    tableLayer.addRenderingFunc(table.getTableRenderer());
    if (table.group_by.length > 0) {
        tableLayer.setIndexerType("PsqlPredicatedTableIndexer");
    }
    canvas.addLayer(tableLayer);

    if (!args.view) {
        var tableView = new View(
            table.name + "_view",
            0,
            0,
            Math.floor(table.sum_width * 0.8),
            700
        );
        this.addView(tableView);
        this.setInitialStates(tableView, canvas, 0, 0);
    } else if (!(args.view instanceof View))
        throw new Error("Constructing Table: view must be a View object");

    return {canvas, view: args.view ? args.view : tableView};
}

/**
 * Add an ssv to a project, this will create a hierarchy of canvases that form a pyramid shape
 * @param ssv an SSV object
 * @param args an dictionary that contains customization parameters, see doc
 * @returns {Array} an array of canvas objects that correspond to the hierarchy
 */
function addSSV(ssv, args) {
    if (args == null) args = {};

    // add to project
    this.ssvs.push(ssv);

    // add stuff to renderingParam
    var renderingParams = {
        textwrap: require("./template-api/Utilities").textwrap,
        processClusterAgg: require("./template-api/SSV").processClusterAgg,
        serializePath: require("./template-api/Utilities").serializePath,
        translatePathSegments: require("./template-api/Utilities")
            .translatePathSegments,
        parsePathIntoSegments: require("./template-api/Utilities")
            .parsePathIntoSegments,
        aggKeyDelimiter: ssv.aggKeyDelimiter,
        loX: ssv.loX,
        loY: ssv.loY,
        hiX: ssv.hiX,
        hiY: ssv.hiY,
        bboxW: ssv.bboxW,
        bboxH: ssv.bboxH,
        zoomFactor: ssv.zoomFactor,
        fadeInDuration: 200,
        geoInitialLevel: ssv.geoInitialLevel,
        geoInitialCenterLat: ssv.geoLat,
        geoInitialCenterLon: ssv.geoLon
    };
    renderingParams = {
        ...renderingParams,
        ...ssv.clusterParams,
        ...ssv.aggregateParams,
        ...ssv.hoverParams,
        ...ssv.legendParams,
        ...ssv.axisParams
    };
    var rpKey = "ssv_" + (this.ssvs.length - 1);
    var rpDict = {};
    rpDict[rpKey] = renderingParams;
    this.addRenderingParams(rpDict);

    // construct canvases
    var curPyramid = [];
    var transform = new Transform(ssv.query, ssv.db, "", [], true);
    var numLevels = Math.min(
        ssv.numLevels,
        args.pyramid ? args.pyramid.length : 1e10
    );
    for (var i = 0; i < numLevels; i++) {
        var width = (ssv.topLevelWidth * Math.pow(ssv.zoomFactor, i)) | 0;
        var height = (ssv.topLevelHeight * Math.pow(ssv.zoomFactor, i)) | 0;

        // construct a new canvas
        var curCanvas;
        if (args.pyramid) {
            curCanvas = args.pyramid[i];
            if (
                Math.abs(curCanvas.width - width) > 1e-3 ||
                Math.abs(curCanvas.height - height) > 1e-3
            )
                throw new Error("Adding SSV: Canvas sizes do not match.");
        } else {
            curCanvas = new Canvas(
                "ssv" + (this.ssvs.length - 1) + "_" + "level" + i,
                width,
                height
            );
            this.addCanvas(curCanvas);
        }
        curPyramid.push(curCanvas);

        // add static legend layer
        var staticLayer = new Layer(null, true);
        curCanvas.addLayer(staticLayer);
        staticLayer.addRenderingFunc(ssv.getLegendRenderer());
        staticLayer.setSSVId(this.ssvs.length - 1 + "_" + i);

        // create one layer
        var curLayer = new Layer(transform, false);
        curCanvas.addLayer(curLayer);

        // set fetching scheme
        if (ssv.clusterMode == "contour" || ssv.clusterMode == "heatmap")
            curLayer.setFetchingScheme("dbox", false);
        //curLayer.setFetchingScheme("tiling");

        // set ssv ID
        curLayer.setIndexerType("SSVInMemoryIndexer");
        //curLayer.setIndexerType("SSVCitusIndexer");
        curLayer.setSSVId(this.ssvs.length - 1 + "_" + i);

        // dummy placement
        curLayer.addPlacement({
            centroid_x: "con:0",
            centroid_y: "con:0",
            width: "con:0",
            height: "con:0"
        });

        // construct rendering function
        curLayer.addRenderingFunc(ssv.getLayerRenderer());

        // tooltips
        curLayer.addTooltip(ssv.tooltipColumns, ssv.tooltipAliases);

        // map layer
        if (ssv.mapBackground) {
            var mapLayer = new Layer(
                require("./Transform").defaultEmptyTransform,
                false
            );
            curCanvas.addLayer(mapLayer);
            mapLayer.addRenderingFunc(ssv.getMapRenderer());
            mapLayer.addPlacement({
                centroid_x: "con:0",
                centroid_y: "con:0",
                width: "con:0",
                height: "con:0"
            });
            mapLayer.setFetchingScheme("dbox", false);
            mapLayer.setSSVId(this.ssvs.length - 1 + "_" + i);
        }

        // axes
        if (ssv.axis) {
            curCanvas.addAxes(
                ssv.getAxesRenderer(i),
                "ssv_" + (this.ssvs.length - 1)
            );
        }
    }

    // literal zooms
    for (var i = 0; i + 1 < ssv.numLevels; i++) {
        var hasLiteralZoomIn = false;
        var hasLiteralZoomOut = false;
        for (var j = 0; j < this.jumps.length; j++) {
            if (
                this.jumps[j].sourceId == curPyramid[i].id &&
                this.jumps[j].type == "literal_zoom_in"
            ) {
                if (this.jumps[j].destId != curPyramid[i + 1].id)
                    throw new Error(
                        "Adding SSV: malformed literal zoom pyramid."
                    );
                hasLiteralZoomIn = true;
            }
            if (
                this.jumps[j].sourceId == curPyramid[i + 1].id &&
                this.jumps[j].type == "literal_zoom_out"
            ) {
                if (this.jumps[j].destId != curPyramid[i].id)
                    throw new Error(
                        "Adding SSV: malformed literal zoom pyramid."
                    );
                hasLiteralZoomOut = true;
            }
        }
        if (!hasLiteralZoomIn)
            this.addJump(
                new Jump(curPyramid[i], curPyramid[i + 1], "literal_zoom_in")
            );
        if (!hasLiteralZoomOut)
            this.addJump(
                new Jump(curPyramid[i + 1], curPyramid[i], "literal_zoom_out")
            );
    }

    // create a new view if not specified
    if (!args.view) {
        var viewId = "ssv" + (this.ssvs.length - 1);
        var view = new View(
            viewId,
            0,
            0,
            ssv.topLevelWidth,
            ssv.topLevelHeight
        );
        this.addView(view);
        // initialize view
        this.setInitialStates(view, curPyramid[0], 0, 0);
    } else if (!(args.view instanceof View))
        throw new Error("Constructing SSV: view must be a View object");

    return {pyramid: curPyramid, view: args.view ? args.view : view};
}

// Add a rendering parameter object
function addRenderingParams(renderingParams) {
    if (renderingParams == null) return;
    // merge with old dictionary
    var newRenderingParam = Object.assign(
        {},
        JSON.parse(this.renderingParams),
        renderingParams
    );
    this.renderingParams = JSON.stringify(newRenderingParam, function(
        key,
        value
    ) {
        if (typeof value === "function") return value.toString();
        return value;
    });
}

// adding a static CSS string
function addStyles(styles) {
    if (!styles || typeof styles != "string") return;

    //match http:// and https://
    var rules;
    if (styles.match(/https?:\/\//)) {
        rules = styles;
    } else if (styles.match(".css")) {
        rules = fs.readFileSync(styles).toString();
    } else {
        rules = styles;
    }

    this.styles.push(rules);
    // merge with current CSS
}

/**
 * Set the initial states for a view object
 * @param {object} canvasObj - a canvas object representing the initial canvas
 * @param {number} viewportX - x coordinate of the initial viewport (top left)
 * @param {number} viewportY - y coordinate of the initial viewport (top left)
 * @param {array} predicates - the initial predicates to be added to the sql query of data transforms
 */
function setInitialStates(
    viewObj,
    canvasObj,
    viewportX,
    viewportY,
    predicates
) {
    // check whether viewObj is in the project
    var viewExist = 0;
    for (var i = 0; i < this.views.length; i++)
        if (this.views[i].id == viewObj.id) viewExist = 1;
    if (!viewExist) throw new Error("Initialize view: unidentified viewObj.");

    // check whether canvasObj has an id field
    if (canvasObj.id == null)
        throw new Error("Initialize view: unidentified canvasObj.");

    // check if this id exists
    var canvasId = -1;
    for (var i = 0; i < this.canvases.length; i++)
        if (this.canvases[i].id === canvasObj.id) canvasId = i;
    if (canvasId == -1)
        throw new Error("Initialize view: unidentified canvasObj.");

    // check viewport range
    if (
        this.canvases[canvasId].w > 0 &&
        (viewportX < 0 || viewportX + viewObj.width > this.canvases[canvasId].w)
    )
        throw new Error("Initialize view: viewportX out of range.");
    if (
        this.canvases[canvasId].h > 0 &&
        (viewportY < 0 ||
            viewportY + viewObj.height > this.canvases[canvasId].h)
    )
        throw new Error("Initialize view: viewportY out of range.");

    // check if the size of the predicates array equals the number of layers
    if (predicates == null) predicates = {};

    // assign fields
    viewObj.initialCanvasId = canvasObj.id;
    viewObj.initialViewportX = viewportX;
    viewObj.initialViewportY = viewportY;
    viewObj.initialPredicates = JSON.stringify(predicates);
}

/**
 * set fetching schemes for all layers
 * @param fetchingScheme
 * @param deltaBox
 */
function setFetchingScheme(fetchingScheme, deltaBox) {
    for (var i = 0; i < this.canvases.length; i++)
        for (var j = 0; j < this.canvases[i].layers.length; j++)
            if (!this.canvases[i].layers[j].isStatic)
                this.canvases[i].layers[j].setFetchingScheme(
                    fetchingScheme,
                    deltaBox
                );
}

function sendProjectRequestToBackend(portNumber, projectJSON) {
    // set up http post connections
    var post_options = {
        host: "localhost",
        port: portNumber,
        path: "/project",
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded"}
    };
    if (process.argv.length == 3 && process.argv[2] == "-f") {
        // node app.js -f
        console.log(
            "forcing recompute via HTTP header X-Kyrix-Force-Recompute: 1"
        );
        post_options["headers"]["X-Kyrix-Force-Recompute"] = "1";
    }
    if (process.argv.length == 3 && process.argv[2] == "-s") {
        // node app.js -s
        console.log(
            "skipping recompute via HTTP header X-Kyrix-Skip-Recompute: 1"
        );
        post_options["headers"]["X-Kyrix-Skip-Recompute"] = "1";
    }
    console.log(post_options);
    var post_req = http.request(post_options, function(res) {
        res.setEncoding("utf8");
        res.on("data", function(chunk) {
            console.log("Response: " + chunk);
        });
    });

    // send the project definition to backend server
    post_req.write(projectJSON);
    post_req.end();
}

// save the current project, and send it to backend server
function saveProject() {
    var config = this.config;

    // final checks before saving
    if (this.ssvs.length > 0 && config.database == "mysql")
        throw new Error(
            "Auto drill down for MySQL is not supported right now."
        );
    if (this.views.length == 0)
        throw new Error("No view object specified in the project.");
    for (var i = 0; i < this.canvases.length; i++) {
        // a canvas should have at least one layer
        if (this.canvases[i].layers.length == 0)
            throw new Error("Canvas " + this.canvases[i].id + " has 0 layers.");
        for (var j = 0; j < this.canvases[i].layers.length; j++) {
            // a static layer does not need a placement object
            if (
                this.canvases[i].layers[j].isStatic &&
                this.canvases[i].layers[j].placement != null
            )
                throw new Error(
                    "Canvas " +
                        this.canvases[i] +
                        " layer " +
                        j +
                        " is static and does not need a placement object."
                );
            // a dynamic layer does need a placement object
            else if (
                !this.canvases[i].layers[j].isStatic &&
                this.canvases[i].layers[j].placement == null
            )
                throw new Error(
                    "Canvas " +
                        this.canvases[i] +
                        " layer " +
                        j +
                        " is dynamic and requires a placement object."
                );
            // columns in the placement object should exist in the transform
            if (this.canvases[i].layers[j].placement != null) {
                var curPlacement = this.canvases[i].layers[j].placement;
                var curTransform = this.canvases[i].layers[j].transform;
                var placementColNames = [];
                if (curPlacement.centroid_x.startsWith("col"))
                    placementColNames.push(curPlacement.centroid_x.substr(4));
                if (curPlacement.centroid_y.startsWith("col"))
                    placementColNames.push(curPlacement.centroid_y.substr(4));
                if (curPlacement.width.startsWith("col"))
                    placementColNames.push(curPlacement.width.substr(4));
                if (curPlacement.height.startsWith("col"))
                    placementColNames.push(curPlacement.height.substr(4));
                for (var k = 0; k < placementColNames.length; k++) {
                    var exist = false;
                    for (var p = 0; p < curTransform.columnNames.length; p++)
                        if (placementColNames[k] == curTransform.columnNames[p])
                            exist = true;
                    if (!exist)
                        throw new Error(
                            "Unidentified placement column name: " +
                                placementColNames[k]
                        );
                }
            }
        }
    }

    // calculate zoom level for canvases
    for (var i = 0; i < this.canvases.length; i++) {
        var curCanvas = this.canvases[i];
        var hasAncestor = false;
        for (var j = 0; j < this.jumps.length; j++) {
            if (
                this.jumps[j].destId == curCanvas.id &&
                this.jumps[j].type == "literal_zoom_in"
            ) {
                hasAncestor = true;
                break;
            }
        }
        if (hasAncestor) continue;
        curCanvas.pyramidLevel = 0; // top zoom level
        while (true) {
            var successor = null;
            for (var j = 0; j < this.jumps.length; j++) {
                if (
                    this.jumps[j].sourceId == curCanvas.id &&
                    this.jumps[j].type == "literal_zoom_in"
                ) {
                    successor = this.jumps[j].destId;
                    break;
                }
            }
            if (successor == null) break;
            for (var j = 0; j < this.canvases.length; j++)
                if (this.canvases[j].id == successor) {
                    this.canvases[j].pyramidLevel = curCanvas.pyramidLevel + 1;
                    curCanvas = this.canvases[j];
                }
        }
    }

    // check argv
    if (process.argv.length > 3)
        throw new Error("more than 1 command line arguments");
    if (
        process.argv.length == 3 &&
        process.argv[2] !== "-f" &&
        process.argv[2] != "-s"
    )
        throw new Error("unrecognized argument: " + process.argv[2]);

    // prepare project definition JSON strings
    var projectJSON = JSON.stringify(this, function(key, value) {
        if (typeof value === "function") return value.toString();
        return value;
    });
    var logJSON = JSON.stringify(
        this,
        function(key, value) {
            if (typeof value === "function") return value.toString();
            return value;
        },
        4
    );
    //console.log(logJSON);

    // add escape character to projectJSON
    var projectJSONEscapedMySQL = (projectJSON + "")
        .replace(/[\\"']/g, "\\$&")
        .replace(/\u0000/g, "\\0");
    var projectJSONEscapedPSQL = projectJSON.replace(/\'/g, "''");

    // construct queries
    var createTableQuery =
        "CREATE TABLE IF NOT EXISTS project (name VARCHAR(255), content TEXT, dirty int" +
        ", CONSTRAINT PK_project PRIMARY KEY (name));" +
        "CREATE TABLE IF NOT EXISTS stats (ID serial PRIMARY KEY, project_name VARCHAR(255), canvas_id TEXT, query_type TEXT, fetch_time_ms FLOAT, rows_fetched INT)";
    var deleteProjQuery =
        "DELETE FROM project where name = '" + this.name + "'";
    var insertProjQueryMySQL =
        "INSERT INTO project (name, content, dirty) VALUES ('" +
        this.name +
        "', '" +
        projectJSONEscapedMySQL +
        "', 1);";
    var insertProjQueryPSQL =
        "INSERT INTO project (name, content, dirty) VALUES ('" +
        this.name +
        "', '" +
        projectJSONEscapedPSQL +
        "', 1);";

    // connect to databases
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
        dbConn.query(createDbQuery, function(err) {});

        // use db
        dbConn.query(useDbQuery, function(err) {
            if (err) throw err;
        });

        // create a table and ignore the error
        dbConn.query(createTableQuery, function(err) {});

        // delete the project definition and ignore the error
        dbConn.query(deleteProjQuery, function(err) {});

        // insert the project definition
        dbConn.query(insertProjQueryMySQL, function(err) {
            if (err) throw err;
            sendProjectRequestToBackend(config.serverPortNumber, projectJSON);
        });

        // end connection
        dbConn.end();
    } else if (config.database == "psql" || config.database == "citus") {
        var createDbQuery = 'CREATE DATABASE "' + config.kyrixDbName + '"';
        var useDbQuery = 'USE "' + config.kyrixDbName + '";';

        // construct a connection to the postgres db to create Kyrix db
        var postgresConn = new psql.Client({
            host: config.serverName,
            user: config.userName,
            password: config.password,
            database: "postgres"
        });

        // create Kyrix DB and ignore error
        postgresConn.connect(function(err) {
            if (err)
                console.error(
                    "****** Error in connecting to postgres db\n****** Call Stack from Node:"
                );
            else console.log("connected");
            if (err) throw err;

            postgresConn.query(createDbQuery, function(err) {
                // ignoring the error here
                var dbConn = new psql.Client({
                    host: config.serverName,
                    user: config.userName,
                    password: config.password,
                    database: config.kyrixDbName
                });

                // connect and pose queries
                dbConn.connect(function(err) {
                    if (err)
                        console.error(
                            "****** Error in connecting to kyrix db\n****** Call Stack from Node:"
                        );
                    else console.log("connected");
                    if (err) throw err;

                    // create a table and ignore the error
                    dbConn.query(createTableQuery, function(err) {
                        if (err)
                            console.error(
                                "****** Error in creating the project table\n****** Call Stack from Node:"
                            );
                        else console.log("project table created");
                        if (err) throw err;

                        // delete the project if exists
                        dbConn.query(deleteProjQuery, function(err) {
                            if (err)
                                console.error(
                                    "error with delete project",
                                    err.stack
                                );
                            else console.log("old project record deleted");
                            if (err) throw err;

                            // insert the JSON blob into the project table
                            dbConn.query(insertProjQueryPSQL, function(err) {
                                if (err)
                                    console.error(
                                        "error with insert project",
                                        err.stack
                                    );
                                else console.log("new project record inserted");
                                if (err) throw err;

                                sendProjectRequestToBackend(
                                    config.serverPortNumber,
                                    projectJSON
                                );
                                dbConn.end();
                                postgresConn.end();
                            });
                        });
                    });
                });
            });
        });
    } else {
        console.error("unknown database type", config.database);
    }
}

// define prototype functions
Project.prototype = {
    addView,
    addCanvas,
    addJump,
    addTable,
    addSSV,
    addRenderingParams,
    addStyles,
    setInitialStates,
    setFetchingScheme,
    saveProject
};

// exports
module.exports = {
    Project
};
