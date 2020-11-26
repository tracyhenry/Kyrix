const Canvas = require("../Canvas").Canvas;
const View = require("../View").View;
const Layer = require("../Layer").Layer;
const Transform = require("../Transform").Transform;

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
    this.addStyles(__dirname + "/css/table.css");
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
            Math.floor(table.sum_width * 0.8),
            700
        );
        this.addView(tableView);
        this.setInitialStates(tableView, canvas, 0, 0);
    } else if (!(args.view instanceof View))
        throw new Error("Adding Table: view must be a View object");

    return {canvas, view: args.view ? args.view : tableView};
}

module.exports = {
    addTable
};
