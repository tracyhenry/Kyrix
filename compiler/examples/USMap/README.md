# US Crime Rate Map
<p align="center">
<a href="https://github.com/tracyhenry/Kyrix/tree/master/compiler/examples/USMap">
<img src="https://media.giphy.com/media/ifY54Kuou1tXooFQTW/giphy.gif" width = "450"/>
</a>
</p>

This example app has two canvases. The top-level canvas shows state-level US crime rates, where darker colors indicate higher crime crime rates per 100,000 population. The user can click on a state, and zoom into a detailed county-level crime rate map centered at the clicked state. On the county canvas, the user can pan around. 

# How to get this app running
After running `sudo ./run-kyrix.sh --nba`, open another terminal tab and run the following commands:
```
> wget https://www.dropbox.com/s/youvfap909mk1m3/usmap_db_psql.sql     # download data
> sudo ./docker-scripts/load-sql.sh usmap_db_psql.sql --dbname usmap   # load data into the database, must be run in root folder
> cp docker-scripts/compile.sh compiler/examples/USMap/compile.sh      # copy the compile script
> cd compiler/examples/USMap                                           # go to the app directory
> chmod +x compile.sh                                                  # make the compile script excutable
> sudo ./compile.sh USMap.js                                           # compile the application
```
