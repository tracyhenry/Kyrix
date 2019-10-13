// libraries
const Project = require("../../src/index").Project;
const AutoDD = require("../../src/template-api/AutoDD").AutoDD;
const renderers = require("./renderers");

// construct a project
var p = new Project("fifa_autodd", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);
p.addStyles(renderers.glyphStyles);

// set up auto drill down
var query = "select * from players order by cast(wage as int) desc";

var attributes = [
    "defending",
    "general",
    "mental",
    "passing",
    "mobility",
    "power",
    "rating",
    "shooting"
];

var autoDD = {
    data: {
        db: "fifa19",
        query: query
    },
    x: {
        col: "shooting",
        range: [0, 100]
    },
    y: {
        col: "defending",
        range: [100, 0]
    },
    aggregate: {
        mode: "number",
        attributes: attributes
    },
    rendering: {
        mode: "glyph+object",
        topLevelWidth: 1600,
        topLevelHeight: 1000,
        axis: true,
        glyph: {
            type: "radar",
            attributes: attributes,
            value: "average",
            size: 80,
            ticks: 5,
            domain: 100
        },
        obj: {
            renderer: renderers.playerRendering,
            bboxW: 200,
            bboxH: 200
        }
    }
};

p.addAutoDD(new AutoDD(autoDD));
p.saveProject();
