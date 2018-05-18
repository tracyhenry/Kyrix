# Kyrix - Generalized Interactive Panning/Zooming Interfaces
## How to Contribute
See [development workflow](https://github.com/tracyhenry/Kyrix/wiki/Development-Workflow).



## Dependencies
### Node.js
Install Node.js ([https://nodejs.org/en/](https://nodejs.org/en/)). The `node.js` libraries needed for using `kyrix` apis are listed in `compiler/package.json`. 

### MySQL
Install MySQL: [Mac](https://gist.github.com/nrollr/3f57fc15ded7dddddcc4e82fe137b58e)/[Windows](https://dev.mysql.com/doc/refman/5.7/en/windows-installation.html)


## How to Run Kyrix
* Get a MySQL server running. 

* Write visualization spec according to the spec api documentation (to be added). An example spec is in `compiler/test.js`. Note that to create a project, a db config file containing the host, username and password of the MySQL server needs to be provided. An example db config file is in `compiler/dbconfig.example`. Never check the db config file into the repo. 

* Run the spec using node.js. To run the example spec, go to the `compiler` folder, run

      $ node test.js
    
    Three things to expect after running the spec: 
    (1) a `Kyrix` MySQL database will be created (if not existed), (2) a `project` table will be created to store the definition of the project and (3) a `tile` table will be created to store some precomputed tiles. 

* Get the tile server running (see documentation in `tile-server/`). 

* Open the index page of the server in the browser and start browsing! 

### TODOs

- [ ] Literal zoom sampling API
- [ ] Static Jumps
- [ ] layer toggling
- [ ] Pretty examples
