This folder has several examples for higher-level APIs built on top of the [base Kyrix API](https://github.com/tracyhenry/Kyrix/wiki/API-Reference). Currently, only examples for [Kyrix-S](https://github.com/tracyhenry/Kyrix/wiki/Kyrix%E2%80%90S-API-Reference) (files starting with `SSV_`) are well tested. 

## NBA game SSVs (Scalable Scatterplot Visualizations)
Files `SSV_circle.js`, `SSV_contour.js` and `SSV_custom.js` correspond to three different SSVs of NBA games, where X axis is the score of the home team, Y axis is the score of the away team, and games between higher-ranked teams appear on top levels. These three examples respectively represent games using clustered circles, contour lines, and a custom rendered scoreboard. 

<p align="center">
  <img src="https://media.giphy.com/media/f94zuFbegahKMguIed/giphy.gif" width="650" />
</p>

The data for these three examples are pre-loaded into Docker containers after you run `sudo ./run-kyrix.sh --nba`, so you only need to run the following commands to start them:
```
cp docker-scripts/compile.sh compiler/examples/template-api-examples/compile.sh      # copy the compile script
cd compiler/examples/template-api-examples                                           # go to the app directory
chmod +x compile.sh                                                                  # make the compile script excutable
sudo ./compile.sh SSV_circle.js                                                      # compile the application
```
Replace `circle` in the last line with `contour` or `custom` to see `SSV_circle` or `SSV_custom`. 

## FIFA video game SSVs
Files `SSV_radar.js`, `SSV_pie.js` and `SSV_dot.js` correspond to three different SSVs of players in the video game FIFA20. In the top left is a radar-chart-based SSV where clusters of players are represented using radar charts that show aggregated player stats on 8 axes. In the top right  is a simple dot-based SSV where each dot is a player, its size maps to the player's defensive rating and its color maps to the age group of the player. In the bottom is a pie-chart-based SSV where each pie represents the age group of a cluster of players. 

<p align="center">
  <img src="https://media.giphy.com/media/LdBGX7V5GqbUNU0iVw/giphy.gif" width="750" />
</p>

To get these three applications running, run the following commands:
```
wget https://www.dropbox.com/s/sd5vx2rkdsqcwtv/fifa20.csv                            # download data
sudo ./docker-scripts/load-csv.sh fifa20.csv                                         # load data into the db container (must be run in the root folder)
cp docker-scripts/compile.sh compiler/examples/template-api-examples/compile.sh      # copy the compile script
cd compiler/examples/template-api-examples                                           # go to the app directory
chmod +x compile.sh                                                                  # make the compile script excutable
sudo ./compile.sh SSV_radar.js                                                       # compile the application
```
Replace `radar` in the last line with `pie/dot` to see `SSV_pie/SSV_dot`. 

## Other Template API examples
WIP - stay tuned. 
