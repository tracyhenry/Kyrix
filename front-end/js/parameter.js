// parameters
var param = {};

// animation durations, delays
param.semanticZoomEnteringDelta = 0.5;
param.semanticZoomEnteringDuration = 1300;
param.literalZoomDuration = 500;
param.oldRemovalDelay = 100;

// semantic zoom scale factor
param.semanticZoomScaleFactor = 4;

// entering initial scale factor
param.enteringScaleFactor = 2.5;

// threshold for t when fade starts
param.fadeThreshold = 0.5;

// tile entering animation duration
param.tileEnteringDuration = 150;

// axes & static trim fading in/out duration
param.axesOutDuration = 400;
param.axesInDuration = 400;
param.staticTrimInDuration = 500;
param.staticTrimOutDuration = 500;
param.popoverOutDuration = 200;

// zoom factor per step (double click, zoom buttons)
param.literalZoomFactorPerStep = 2;

// for coordinated highlighting - dim opacity
param.dimOpacity = 0.4;

// extra tiles per dimension
param.extraTiles = 0;

// padding for the container svg
param.viewPadding = 50;

// jump types
param.literalZoomIn = "literal_zoom_in";
param.literalZoomOut = "literal_zoom_out";
param.semanticZoom = "semantic_zoom";
param.geometricSemanticZoom = "geometric_semantic_zoom";
param.load = "load";
param.highlight = "highlight";

// fetching scheme -- either tiling or dbox
param.fetchingScheme = "dbox";

// whether use delta box
param.deltaBox = true;

// epsilon
param.eps = 1e-5;
