const getBodyStringOfFunction = require("./Renderers").getBodyStringOfFunction;

/* 
 * Constructor of a USMap
 * @param args
 * @constructor
 * by nyrret on 09/24/19
 */

// return USMap obj for use increating USMap project
function USMap(args) {
  if (args == null) args = {};

  // verify and store args
  var requiredArgs = ["db", "table", "rate_col"];
  var requiredArgsTypes = ["string", "string", "string"];
  checkArgs("USMap", requiredArgs, requiredArgTypes, args);

  this.db = args.db
  this.table = args.table;
  this.rate_col = args.rate_col;

  // TODO: create the USMap object that can be added to a project (like in index)
  return {};
} // end USMap constructor

function getUSMapTransformFunc() {
} // end func getUSMapTransformFunc

function getUSMapRenderer {
} // end func getUSMapRenderer

USMap.prototype = {
  getUSMapTransformFunc,
  getUSMapRenderer
};

module.exports = {
  USMap: USMap,
  getUSMapTransformFunc,
  getUSMapRenderer
};
