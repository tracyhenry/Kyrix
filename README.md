
# Kyrix - Generalized Interactive Panning/Zooming Visualizations

![Build status](https://travis-ci.org/tracyhenry/Kyrix.svg?branch=master)

<p float="left">
  <img src="https://github.com/tracyhenry/Kyrix/blob/master/img/usmap_demo.gif" width="400" />
  <img src="https://github.com/tracyhenry/Kyrix/blob/master/img/forest_demo.gif" width="400" height="209.33"/>
  <img src="https://github.com/tracyhenry/Kyrix/blob/master/img/nba_demo.gif" width="400" height="309.33" />
  <img src="https://github.com/tracyhenry/Kyrix/blob/master/img/flare_demo.gif" width="400"/>
</p>

## Installation instructions for the impatient

Just install [docker CE](https://docs.docker.com/install/) for your laptop or server,
install [docker-compose](https://docs.docker.com/compose/install/) and then run `docker-compose up`.
Depending on CPU and network speed, after 10-20mins a Kyrix server will be up and you can point a
browser at http://<computer>:8000/ and see a bunch of NBA team logos, which are part of the
[NBA example](https://github.com/tracyhenry/Kyrix/tree/master/compiler/examples/nba).

Depending on your network and CPU, please allow 10-20 minutes for fresh installs to startup.
This docker config works great on cloud instances, e.g. AWS, Google Cloud, Azure, etc.
We recommend 2-4+ CPUs and 4+ GB RAM, though it might be possible to run smaller configurations
e.g. for automated testing.

## More information
* [Quick-start Tutorial](https://github.com/tracyhenry/Kyrix/wiki/Tutorial)
* [API Reference](https://github.com/tracyhenry/Kyrix/wiki/API-Reference)
* [How to Contribute](https://github.com/tracyhenry/Kyrix/wiki/How-to-Contribute)
* [Manual Installation](https://github.com/tracyhenry/Kyrix/wiki/Installation-Details)
* [Docker Config Details](https://github.com/tracyhenry/Kyrix/wiki/Docker-Config-Details)
