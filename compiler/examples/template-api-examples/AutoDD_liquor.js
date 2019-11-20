// libraries
const Project = require("../../src/index").Project;
const AutoDD = require("../../src/template-api/AutoDD").AutoDD;

// construct a project
var p = new Project("liquor_autodd", "../../../config.txt");

// set up auto drill down
var query = "select * from liquor_sales;";

var autoDD = {
    data: {
        db: "kyrix",
        query: query
    },
    layout: {
        x: {
            field: "price",
            extent: [0, 7000]
        },
        y: {
            field: "bottles",
            extent: [15000, 0]
        },
        z: {
            field: "date",
            order: "desc"
        }
    },
    marks: {
        cluster: {
            mode: "pie",
            aggregate: {
                dimensions: [
                    {
                        field: "day",
                        domain: ["1", "2", "3", "4", "5", "6", "7"]
                    }
                ],
                measures: [
                    {
                        field: "*",
                        function: "count"
                    }
                ]
            },
            config: {}
        },
        hover: {
            rankList: {
                mode: "tabular",
                fields: ["store", "item", "total"],
                //fields: ["store", "date", "item", "price", "bottles", "gallons", "total"],
                topk: 3
            },
            boundary: "convexhull"
        }
    },
    config: {
        topLevelWidth: 1500,
        topLevelHeight: 1000,
        axis: true,
        legendTitle:
            "On Which Day of the Week Do Retailers Buy Liquor in Iowa?",
        legendDomain: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    }
};

p.addAutoDD(new AutoDD(autoDD));
p.saveProject();
