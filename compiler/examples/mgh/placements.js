var dummyEEGPlacement = {'centroid_x' : '', 'centroid_y' : '', 'width' : '', 'height' : ''};

var clusterPlacement =  {};
clusterPlacement.centroid_x = "col:x";
clusterPlacement.centroid_y = "col:y";
clusterPlacement.width = "con:10";
clusterPlacement.height = "con:10";

var dummySpectrogramPlacement = {'centroid_x' : '', 'centroid_y' : '', 'width' : '', 'height' : ''};

module.exports = {
    dummyEEGPlacement : dummyEEGPlacement,
    clusterPlacement : clusterPlacement,
    dummySpectrogramPlacement : dummySpectrogramPlacement
};
