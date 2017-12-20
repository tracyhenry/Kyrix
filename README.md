# Kyrix

# Introduction
Generalized interactive panning/zooming interfaces

# Dependencies
## Node.js

## MySQL

## Java

# How to Run Kyrix
* Get a MySQL server running.

* Write visualization spec according to the api documentation (to be added). Run the spec using node.js. Three things to be expected after running the spec: (1) a `canvas` MySQL database will be created to store the definitions of the cavases, (2) a `tile` MySQL database will be created to store some precomputed tiles and (3) a frontend configuration file will be generated (name and place to be decided). 

* Get the backend server running and waiting for requests (see documentation in the backend folder). 

* Open the generated frontend file in the browser and start browsing!
