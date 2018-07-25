var stateMapPlacement = {};
stateMapPlacement.centroid_x = "col:bbox_x";
stateMapPlacement.centroid_y = "col:bbox_y";
stateMapPlacement.width = "con:400";
stateMapPlacement.height = "con:400";

var countyMapPlacement = {};
countyMapPlacement.centroid_x = "col:bbox_x";
countyMapPlacement.centroid_y = "col:bbox_y";
countyMapPlacement.width = "col:bbox_w";
countyMapPlacement.height = "col:bbox_h";

module.exports = {
    stateMapPlacement : stateMapPlacement,
    countyMapPlacement : countyMapPlacement
};
