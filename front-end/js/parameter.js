// parameters
var param = {};

// animation durations, delays
param.semanticZoomEnteringDelta = 0.5;
param.semanticZoomEnteringDuration = 1300;
param.slideExitDuration = 700;
param.slideEnteringDuration = 700;
param.slideSwitchDelay = 230;
param.supermanFlyingDuration = 2500;
param.supermanEnteringTime = 500;
param.supermanDisplayDelay = 200;
param.supermanDisplayDuration = 300;
param.literalZoomDuration = 500;
param.literalZoomFadeOutDuration = 150;

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

// padding for .viewsvg
param.viewPadding = 70;

// jump types
param.literalZoomIn = "literal_zoom_in";
param.literalZoomOut = "literal_zoom_out";
param.semanticZoom = "semantic_zoom";
param.geometricSemanticZoom = "geometric_semantic_zoom";
param.load = "load";
param.highlight = "highlight";
param.slide = "slide";

// epsilon
param.eps = 1e-5;

// screen space reserved for buttons
param.buttonAreaWidth = 90;
