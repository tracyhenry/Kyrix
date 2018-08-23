var teamTimelinePlacement = {};
teamTimelinePlacement.centroid_x = "col:x";
teamTimelinePlacement.centroid_y = "col:y";
teamTimelinePlacement.width = "con:160";
teamTimelinePlacement.height = "con:130";

var playByPlayPlacement = {};
playByPlayPlacement.centroid_x = "con:500";
playByPlayPlacement.centroid_y = "col:y";
playByPlayPlacement.width = "con:1000";
playByPlayPlacement.height = "con:100";

var boxscorePlacement = {};
boxscorePlacement.centroid_x = "con:1000";
boxscorePlacement.centroid_y = "con:500";
boxscorePlacement.width = "con:3000";
boxscorePlacement.height = "con:100";

module.exports = {
    teamTimelinePlacement : teamTimelinePlacement,
    playByPlayPlacement : playByPlayPlacement,
    boxscorePlacement : boxscorePlacement
};
