// libraries
const Project = require("../../src/index").Project;
const AutoDD = require("../../src/template-api/AutoDD").AutoDD;
const renderers = require("./renderers");

// construct a project
var p = new Project("fifa_autodd", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);
p.addStyles(renderers.playerRenderingStyles);

// set up auto drill down
var query = "select * from fifa19 order by cast(wage as int) desc";

var autoDD = {
    data: {
        db: "fifa19",
        query: query
    },
    x: {
        col: "rating",
        range: [40, 100]
    },
    y: {
        col: "wage",
        range: [600, 0]
    },
    aggregate: {
        mode: "category",
        attributes: ["agegroup"]
    },
    upper: true,
    marks: {
        cluster: {
            mode: "pie",
            config: {
                // padAngle: 0.05,
                // cornerRadius: 5,
                // outerRadius: 80,
                // innerRadius: 1,
                domain: ["U20", "U23", "U29", "Older"]
            }
        },
        hover: {
            object: renderers.playerRendering,
            convex: true
        }
    },
    legend: {
        title: "Age Groups of Soccer Players in FIFA 2019",
        domain: ["Under 20", "Under 23", "Under 29", "Older"]
    },
    config: {
        topLevelWidth: 1500,
        topLevelHeight: 1000,
        axis: true
    }
};

p.addAutoDD(new AutoDD(autoDD));
p.saveProject();
