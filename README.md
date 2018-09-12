# Kyrix - Generalized Interactive Panning/Zooming Interfaces
## How to Contribute
See [development workflow](https://github.com/tracyhenry/Kyrix/wiki/Development-Workflow).

## Dependencies
### Node.js
Install Node.js ([https://nodejs.org/en/](https://nodejs.org/en/)). The `node.js` libraries needed for using `kyrix` apis are listed in `compiler/package.json`. 

### Underlying Database
`Kyrix` supports MySQL and PostgreSQL. 

Install MySQL: [Mac](https://dev.mysql.com/doc/refman/5.7/en/osx-installation-pkg.html)/[Windows](https://dev.mysql.com/doc/refman/5.7/en/windows-installation.html). Right now there is some issue with versions other than 5.7. So make sure you install 5.7 for now. 

Install [Postgres](https://www.postgresql.org/download/) and [PostGIS](https://postgis.net/install/). If you use macOS, it'll be very convenient to use `homebrew`: just run `brew install postgresql` and `brew install postgis`.  

### Compiler
Go to `compiler/`, run `npm install`. 

### Tile (Backend) Server
The backend dependecies are handled using maven. See `tile-server/pom.xml` for the list of dependencies. To download and install maven, see the instructions [here](https://maven.apache.org/guides/getting-started/maven-in-five-minutes.html). 

## Setup Kyrix
* Get a Database server running (either MySQL or PostgreSQL). 

* Create a config file (`config.txt`) which contains the following six lines (`config.txt.example` is an example. You can run `cp config.txt.example config.txt` to create the config file. Never check any `config.txt` into the repo (`config.txt` is added to `.gitignore`)): 

    * the app name (should be `nba` if you want to run the example app)
    * port number for backend server
    * database being used (either `mysql` or `psql`, case insensitive)
    * database server name
    * database user name
    * password
    * The db name used to store metadata
    * **absolute** path to a directory containing a `node_modules` folder that contains every d3 library (e.g. `d3-scale`, `d3-zoom`). 

  Normally if you have installed dependencies for compiler, you can directly specify the last line as the absolute path to the compiler folder (but this is not always the case -- on some platform, `compiler/node_modules` does not have d3 libraries as direct sub-directories. Instead, d3 libraries are in `compiler/node_modules/d3/node_modules`. So double check). 
  
  Furthermore, to avoid a current issue ([#16](/../../issues/16)), you need to do the following as a workaround:
  
  * go to the directory you specified in the last line of the config file. 
  * open `node_modules/d3/build/d3.node.js` (same on every platform).
  * comment out every line containing `d3-request`. 
    

* Get data for the example app. For MySQL, download a small nba database from (https://www.dropbox.com/s/3chn6r73vzxttr2/nba_db_mysql.sql?dl=0). Load it into your MySQL as follows:

      $ mysql -u username -p                     # login to mysql
      $ Enter password:                          # enter password if necessary
      $ > create database nba                    # create a database 'nba'
      $ > exit                                   # log out
      $ mysql -u root -p nba < nba_db_mysql.sql  # import 
   
   For PostgreSQL, download the nba database from (https://www.dropbox.com/s/baqb01thxvfthk5/nba_db_psql.sql?dl=0). Load it into your PostgreSQL as follows:
   
      $ psql postgres               # login as postgres
      $ Enter password:             # enter password if necessary
      $ > create database nba       # create a database 'nba'
      $ > \q                        # log out
      $ psql nba < nba_db_psql.sql  # import    

* Go to `tile-server/`. Run `mvn compile` to build the server. Run `mvn exec:java -Dexec.mainClass="main.Main"` to start the server. After the server starts, it will prompt that it did not find the spec of the app and is waiting for it. 

* Write spec according to the spec language documentation (to be added). The spec for the example app is in `compiler/examples/nba/nba.js`. 

* Run the spec using node.js. To run the example spec, run

      $ cd compiler/examples/nba
      $ node nba.js
    
    Three things to expect after running the spec: 
    (1) a `Kyrix` database will be created (if not existed), (2) a `project` table will be created (if not existed) to store the specs of the apps and (3) the compiler will notify the tile server that a new spec is ready. The tile server will then start building some indexes. 

* Open your browser and go to `http://localhost:port#` to see the initial canvas. 

* You can debug by modifying the spec and running it again. The tile server will be notified of the changes every time you run a spec, and will recalculate the indexes accordingly. 


