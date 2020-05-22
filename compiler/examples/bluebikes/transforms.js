const Transform = require("../../src/Transform").Transform;

var overallMapTransform = new Transform(
    "select geometry from towns",
    "bluebikes",
    function(row, width, height, param) {
        var ret = [];
        ret.push(row[0]);

        var projection = d3
            .geoAlbers()
            .rotate([71.06, 0])
            .center([0,42.32])
            .scale(param.overallMapScale)
            .translate([width / 2, height / 2]);
        var path = d3.geoPath().projection(projection);
        var feature = JSON.parse(row[0]);
        var centroid = path.centroid(feature);
        ret.push(!isFinite(centroid[0]) ? 0 : centroid[0]);
        ret.push(!isFinite(centroid[1]) ? 0 : centroid[1]);
        
        return Java.to(ret, "java.lang.String[]");
    },
    ["geometry","bbox_x", "bbox_y"],
    true
);

var stationsTransform = new Transform(
    "select station, latitude, longitude, __of_docks from stations",
    "bluebikes",
    function(row, width, height, param) {
        var ret = [];
        ret.push(row[0]);
        ret.push(row[3]);

        var projection = d3
            .geoAlbers()
            .scale(param.overallMapScale)
            .rotate([71.06, 0])
            .center([0,42.32])
            .translate([width / 2, height / 2]);
        var pixel_location = projection([row[2], row[1]]);
        ret.push(!isFinite(pixel_location[0]) ? 0 : pixel_location[0]);
        ret.push(!isFinite(pixel_location[1]) ? 0 : pixel_location[1]);
        
        return Java.to(ret, "java.lang.String[]");
    },
    ["name","num_docks","bbox_x","bbox_y"],
    true
);

var selectStationTransform = new Transform(
    "select station from stations",
    "bluebikes",
    "",
    [],
    true
);


var insetMapTransform = new Transform(
    "select geometry from towns",
    "bluebikes",
    function(row, width, height, param) {
        var ret = [];
        ret.push(row[0]);

        var projection = d3
            .geoAlbers()
            .rotate([71.06, 0])
            .center([0,42.32])
            .scale(param.insetMapScale)
            .translate([width / 2, height / 2]);
        var path = d3.geoPath().projection(projection);
        var feature = JSON.parse(row[0]);
        var centroid = path.centroid(feature);
        ret.push(!isFinite(centroid[0]) ? 0 : centroid[0]);
        ret.push(!isFinite(centroid[1]) ? 0 : centroid[1]);

        return Java.to(ret, "java.lang.String[]");
    },
    ["geometry","bbox_x", "bbox_y"],
    true
);

var countsTransform = new Transform(
    "select count(*), start_station_name, start_station_latitude, start_station_longitude, end_station_name, end_station_latitude, end_station_longitude from rides group by 2,3,4,5,6,7",
    "bluebikes",
    function(row, width, height, param) {
        var ret = [];
        ret.push(row[0]);
        ret.push(row[1]);
        ret.push(row[4]);

        var projection = d3
            .geoAlbers()
            .rotate([71.06, 0])
            .center([0,42.32])
            .scale(param.insetMapScale)
            .translate([width / 2, height / 2]);
        var start_pixel_location = projection([row[3], row[2]]);
        var end_pixel_location = projection([row[6], row[5]]);
        ret.push(!isFinite(start_pixel_location[0]) ? 0 : start_pixel_location[0]);
        ret.push(!isFinite(start_pixel_location[1]) ? 0 : start_pixel_location[1]);   
        ret.push(!isFinite(end_pixel_location[0]) ? 0 : end_pixel_location[0]);
        ret.push(!isFinite(end_pixel_location[1]) ? 0 : end_pixel_location[1]);

        return Java.to(ret, "java.lang.String[]");
    },
    ["count","start_station_name","end_station_name","start_bbox_x","start_bbox_y","end_bbox_x","end_bbox_y"],
    true
);


var ridesTransform = new Transform(
    "select start_station_name, start_station_latitude, start_station_longitude, end_station_name, end_station_latitude, end_station_longitude from rides",
    "bluebikes",
    function(row, width, height, param) {
        var ret = [];
        ret.push(row[0]);
        ret.push(row[3]);

        var projection = d3
            .geoAlbers()
            .rotate([71.06, 0])
            .center([0,42.32])
            .scale(param.insetMapScale)
            .translate([width / 2, height / 2]);
        var start_pixel_location = projection([row[2], row[1]]);
        var end_pixel_location = projection([row[5], row[4]]);
        ret.push(!isFinite(start_pixel_location[0]) ? 0 : start_pixel_location[0]);
        ret.push(!isFinite(start_pixel_location[1]) ? 0 : start_pixel_location[1]);   
        ret.push(!isFinite(end_pixel_location[0]) ? 0 : end_pixel_location[0]);
        ret.push(!isFinite(end_pixel_location[1]) ? 0 : end_pixel_location[1]);

        return Java.to(ret, "java.lang.String[]");
    },
    ["start_station_name","end_station_name","start_bbox_x","start_bbox_y","end_bbox_x","end_bbox_y"],
    true
);

var tableTransform = new Transform(
    "select tripduration, start station name, end station name, birth year, gender from rides",
    "bluebikes",
    "",
    ["duration","start","end","birth_year","gender"],
    true
);

module.exports = {
    overallMapTransform, 
    stationsTransform,
    selectStationTransform,
    insetMapTransform,
    countsTransform,
    ridesTransform,
    tableTransform
};
