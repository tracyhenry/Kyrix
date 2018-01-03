# Kyrix

## Introduction
Generalized interactive panning/zooming interfaces

## Dependencies
### Node.js
Install Node.js ([https://nodejs.org/en/](https://nodejs.org/en/)). The `node.js` libraries needed for running the spec api are listed in 
`compiler/package.json`. 

### MySQL

### Java

## How to Run Kyrix
* Get a MySQL server running.

* Write visualization spec according to the spec api documentation (to be added). 

* Run the spec using node.js. Three things to be expected after running the spec: (1) a `Kyrix` MySQL database will be created (if not existed), (2) a `project` table will be created to store the definition of the project and (3) a `tile` table will be created to store some precomputed tiles. 

* Get the tile server running (see documentation in the backend repo). 

* Open the index page of the server in the browser and start browsing!
