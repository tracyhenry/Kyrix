const Transform = require("../../src/Transform").Transform;

var stateMapTransform = new Transform(
    "select state.state_id, state.name, stateCrimeRate.crimeRate, state.geomstr from (select state_id, avg(crimeRate) as crimeRate from county group by state_id) as stateCrimeRate, state where state.state_id = stateCrimeRate.state_id;",
    "usmap",
    function(row, width, height, param) {
        var ret = [];
        ret.push(row[0]);

        // bounding box columns
        var projection = d3
            .geoAlbersUsa()
            .scale(param.stateMapScale)
            .translate([width / 2, height / 2]);
        var path = d3.geoPath().projection(projection);
        var feature = JSON.parse(row[3]);
        var centroid = path.centroid(feature);
        ret.push(!isFinite(centroid[0]) ? 0 : centroid[0]);
        ret.push(!isFinite(centroid[1]) ? 0 : centroid[1]);
        ret.push(row[1]);
        ret.push(row[2]);
        ret.push(row[3]);

        return Java.to(ret, "java.lang.String[]");
    },
    ["id", "bbox_x", "bbox_y", "name", "crimerate", "geomstr"],
    true
);

var countyMapStateBoundaryTransform = new Transform(
    "select geomstr from state",
    "usmap",
    function(row, width, height, param) {
        var ret = [];

        // bounding box columns
        var projection = d3
            .geoAlbersUsa()
            .scale(param.countyMapScale)
            .translate([width / 2, height / 2]);
        var path = d3.geoPath().projection(projection);
        var feature = JSON.parse(row[0]);
        var centroid = path.centroid(feature);
        var bounds = path.bounds(feature);
        ret.push(!isFinite(centroid[0]) ? 0 : centroid[0]);
        ret.push(!isFinite(centroid[1]) ? 0 : centroid[1]);
        ret.push(
            !isFinite(bounds[0][0]) || !isFinite(bounds[1][0])
                ? 0
                : bounds[1][0] - bounds[0][0]
        );
        ret.push(
            !isFinite(bounds[0][1]) || !isFinite(bounds[1][1])
                ? 0
                : bounds[1][1] - bounds[0][1]
        );
        ret.push(row[0]);

        return Java.to(ret, "java.lang.String[]");
    },
    ["bbox_x", "bbox_y", "bbox_w", "bbox_h", "geomstr"],
    true
);

var countyMapTransform = new Transform(
    "select * from county",
    "usmap",
    function(row, width, height, param) {
        var ret = [];
        ret.push(row[0]);

        // bounding box columns
        var projection = d3
            .geoAlbersUsa()
            .scale(param.countyMapScale)
            .translate([width / 2, height / 2]);
        var path = d3.geoPath().projection(projection);
        var feature = JSON.parse(row[5]);
        var centroid = path.centroid(feature);
        var bounds = path.bounds(feature);
        ret.push(!isFinite(centroid[0]) ? 0 : centroid[0]);
        ret.push(!isFinite(centroid[1]) ? 0 : centroid[1]);
        ret.push(
            !isFinite(bounds[0][0]) || !isFinite(bounds[1][0])
                ? 0
                : bounds[1][0] - bounds[0][0]
        );
        ret.push(
            !isFinite(bounds[0][1]) || !isFinite(bounds[1][1])
                ? 0
                : bounds[1][1] - bounds[0][1]
        );
        for (var i = 1; i <= 5; i++) ret.push(row[i]);

        return Java.to(ret, "java.lang.String[]");
    },
    [
        "id",
        "bbox_x",
        "bbox_y",
        "bbox_w",
        "bbox_h",
        "state_id",
        "name",
        "crimerate",
        "population",
        "geomstr"
    ],
    true
);

module.exports = {
    stateMapTransform: stateMapTransform,
    countyMapTransform: countyMapTransform,
    countyMapStateBoundaryTransform: countyMapStateBoundaryTransform
};
