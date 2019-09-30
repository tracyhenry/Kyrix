// libraries
const Project = require("../../src/index").Project;
const AutoDD = require("../../src/template-api/AutoDD").AutoDD;
const renderers = require("../USMap/renderers");

// construct a project
var p = new Project("USMap_autodd", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);

// set up auto drill down
var query =
    "select state.state_id, state.name, stateCrimeRate.crimeRate, state.geomstr from (select state_id, avg(crimeRate) as crimeRate from county group by state_id) as stateCrimeRate, state where state.state_id = stateCrimeRate.state_id;";

var autoDD = {
    data: {
        db: "usmap",
        query: query
    },
    x: {
        col: "stateCrimeRate.crimeRate",
        range: [69, 149]
    },
    y: {
        col: "state.state_id",
        range: [69, 148]
    },
    rendering: {
        // mode: "object",
        mode: "object+clusternum",
        axis: true,
        obj: {
            renderer: renderers.stateMapRendering,
            bboxW: 162,
            bboxH: 132
        }
    }
};

p.addAutoDD(new AutoDD(autoDD));
p.saveProject();
