// Example using Map template API for US Crime Rate Map
/* probably just transform, etc front-end files, maybe back-e# include USMap template
   - copying over stuff from transform and inex - parameteriz# include renderer
 * data ready when compiled, user specifies rate column
 *   - make note of where to download rate data/where it is stored
 *   - might need to split up db: one for state geomstrs, and other rate data
       (explain to download the files - modify rates one with your rates)
       (merge user's data and shapes data)

  *  - write design doc with what user should provide (params, table schema)
*/

// libraries
const Project = require("../../src/index").Project;
const USMap = require("../../src/template-api/USMap").USMap;  // specify template
const placements = require("../USMap/placements");    // specify transforms

// construct project
var p = new Project("map_template_usmap", "../../../config.txt");

// specify db name to get map data from TODO: separate shapes one
var db = "usmap";
var table = "rates";  
var rate_col = "crime_rate";   // name of column containing data you with to use

// specify args
var args = {
  db: db, 
  table: table,
  rate_col: rate_col,
};

// build project
var USMapProject = new USMap(args);
p.addUSMap(USMapProject);

p.saveProject();
