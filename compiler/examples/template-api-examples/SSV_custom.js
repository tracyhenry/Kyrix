// libraries
const Project = require("../../src/index").Project;
const SSV = require("../../src/template-api/SSV").SSV;
const renderers = require("../nba/renderers");

// construct a project
var p = new Project("ssv_custom", "../../../config.txt");
p.addRenderingParams(renderers.renderingParams);
p.addStyles("../nba/nba.css");

// set up ssv
var query =
    "select game_id, year, month, day, team1.abbr as home_team, team2.abbr as away_team, home_score, away_score, team1.rank + team2.rank as agg_rank " +
    "from games, teams as team1, teams as team2 " +
    "where games.home_team = team1.abbr and games.away_team = team2.abbr ";

var ssv = {
    data: {
        db: "nba",
        query: query
    },
    layout: {
        x: {
            field: "home_score",
            extent: [69, 149]
        },
        y: {
            field: "away_score",
            extent: [69, 148]
        },
        z: {
            field: "agg_rank",
            order: "asc"
        }
    },
    marks: {
        cluster: {
            mode: "custom",
            custom: renderers.teamTimelineRendering,
            config: {
                clusterCount: true,
                bboxW: 162,
                bboxH: 132
            }
        },
        hover: {
            boundary: "convexhull"
        }
    },
    config: {
        axis: true
    }
};

p.addSSV(new SSV(ssv));
p.saveProject();
