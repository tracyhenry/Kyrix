# Kyrix

## Introduction
Generalized interactive panning/zooming interfaces

## Dependencies
### Node.js
Install Node.js ([https://nodejs.org/en/](https://nodejs.org/en/)). The `node.js` libraries needed to be installed to run the frontend api are listed in `frontend/package.json`. 

### MySQL

### Java

## How to Run Kyrix
* Get a MySQL server running.

* Write visualization spec according to the frontend api documentation (to be added). 

* Run the spec using node.js. Three things to be expected after running the spec: (1) a `canvas` MySQL database will be created to store the definitions of the cavases, (2) a `tile` MySQL database will be created to store some precomputed tiles and (3) a frontend file will be generated (name and place to be decided). 

* Get the tile server running and waiting for requests (see documentation in the backend repo). 

* Open the generated frontend file in the browser and start browsing!
