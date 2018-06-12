# Kyrix - Generalized Interactive Panning/Zooming Interfaces
## How to Contribute
See [development workflow](https://github.com/tracyhenry/Kyrix/wiki/Development-Workflow).



## Dependencies
### Node.js
Install Node.js ([https://nodejs.org/en/](https://nodejs.org/en/)). The `node.js` libraries needed for using `kyrix` apis are listed in `compiler/package.json`. 

### MySQL
Install MySQL: [Mac](https://gist.github.com/nrollr/3f57fc15ded7dddddcc4e82fe137b58e)/[Windows](https://dev.mysql.com/doc/refman/5.7/en/windows-installation.html). Right now there is some issue with versions other than 5.7. So make sure you install 5.7 for development purposes. 


## How to Run Kyrix
* Get a MySQL server running. 

* Install dependencies for compiler. Go to `compiler/`, run `npm install`. 

* Write visualization spec according to the spec api documentation (to be added). An example spec is in `compiler/examples/nba/nba.js`. This example spec requires a db config file containing the host, username and password of the MySQL server. Create this needed file by running `cp compiler/dbconfig.example compiler/dbconfig.txt`. Never check any db config file into the repo (`compiler/dbconfig.txt` is added to `.gitignore`). 

* Run the spec using node.js. To run the example spec, run

      $ node compiler/examples/nba/nba.js
    
    Two things to expect after running the spec: 
    (1) a `Kyrix` MySQL database will be created (if not existed) and (2) a `project` table will be created (if not existed) to store the definition of the project. 

* Get the tile server running (see documentation in `tile-server/`). 

* Open the index page of the server in the browser and start browsing! 

### TODOs

- [ ] Prediction algorithms. 
- [ ] Literal zoom sampling API
- [ ] Static Jumps
- [ ] layer toggling
- [ ] Pretty examples
