var dummyEEGPlacement = {'centroid_x' : '', 'centroid_y' : '', 'width' : '', 'height' : ''};

var clusterPlacement =  {};
clusterPlacement.centroid_x = "col:x";
clusterPlacement.centroid_y = "col:y";
clusterPlacement.width = "con:10";
clusterPlacement.height = "con:10";

var spectrumPlacement = {};
spectrumPlacement.centroid_x = "col:x";
spectrumPlacement.centroid_y = "col:y";
spectrumPlacement.width = "con:2";
spectrumPlacement.height = "con:2";

module.exports = {
    dummyEEGPlacement : dummyEEGPlacement,
    clusterPlacement : clusterPlacement,
    spectrumPlacement : spectrumPlacement
};
