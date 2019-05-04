# Embedding API

## API.js
This file implements a set of APIs that embed a Kyrix visualization into an outer web application, and facilitate the interaction between the Kyrix visualization and the web app. Example APIs include attach onPan/onZoom listeners, set what's visible on the canvas, etc.  

## Usage
See `example.html`, which allows you to filter NBA teams whose names start with a given input string (you need to have a kyrix backend serving the NBA app). Todo: package all dependencies together. 

## Implementation
Right now, we run a python web server (`server.py`) to monitor Github repo changes, and use [rollup.js](https://rollupjs.org/guide/en) to concatenate all frontend code into a single JS file every time there is a push to the repo. 
