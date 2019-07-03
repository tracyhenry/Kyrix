
# Kyrix - Easy Creation of Pan/zoom Data Visualizations at Scale

![Build status](https://travis-ci.org/tracyhenry/Kyrix.svg?branch=master) [![code style: 
prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

<p float="left">
  <img src="https://github.com/tracyhenry/Kyrix/blob/master/img/usmap_demo.gif" width="400" />
  <img src="https://github.com/tracyhenry/Kyrix/blob/master/img/forest_demo.gif" width="400" height="209.33"/>
  <img src="https://github.com/tracyhenry/Kyrix/blob/master/img/nba_demo.gif" width="400" height="309.33" />
  <img src="https://github.com/tracyhenry/Kyrix/blob/master/img/flare_demo.gif" width="400"/>
</p>

# About
Kyrix is a system that facilitates the creation of data visualizations with details-on-demand interactions (e.g. pan and zoom, see example demos above). In this paradigm, the user often starts at an overview of the dataset, zooms into a particular region of interest to see more details, zooms out then repeats. As demonstrated by early research, this interaction pattern is easily learnable and particularly effective in reducing users' burden when exploring large datasets, while also preserving their sense of position and context. Many of Pan/zoom visualizations are purpose-built (e.g. Google Maps) and are not easily extensible. Kyrix provides a general framework for easy creation of such visualizations. 

In visualizations of such, the underlying dataset is often large. To deal with large data, Kyrix is focused on optimizing two goals: 1) usable declarative API library for visualization developers and 2) 500ms response time to user interactions, which is required to enable interactive browsing. See our [EuroVis paper](http://web.mit.edu/wenbo/www/kyrix_eurovis.pdf) for more technical details. 

We are working with users from MGH ([30T data vis demo](https://youtu.be/fZ32cE8KEi0)), Paradigm 4, Agero and Recorded Futures to get feedback from serious real-world applications. We look forward to your feedback as well. Take a look at the instructions below to get started and let us know what you think!

## Installation instructions for the impatient

1. Install Docker (e.g. on a Linux system run `sudo apt update; sudo apt install -y docker.io docker-compose;`). 
2. Run `sudo docker-compose up` in the root directory. 
3. Wait a couple minutes, then point your browser at <ip address>:8000 - remember that if you are using a cloud instance you may (probably) need to open your cloud provider's firewall for this port. If that sounds scary, you can create an SSH tunnel from your PC (e.g. Mac) using `ssh -N <server ipaddr> -L 8000:<same ipaddr>:8000` to forward your laptop's port 8000 to the server via [SSH tunneling](https://www.tecmint.com/create-ssh-tunneling-port-forwarding-in-linux/). 

note that you'll need to wait for a message saying `Backend server started...` like this:
```
kyrix_1  | Serving /project
kyrix_1  |  New project definition coming...
kyrix_1  | There is diff that requires recomputing indexes. Shutting down server and recomputing...
kyrix_1  | Precomputing...
kyrix_1  | *** done! Kyrix ready at: http://<host>:8000/  (may need a minute to recompute indexes - watch this log for messages)
kyrix_1  | Done precomputing!
kyrix_1  | Completed recomputing indexes. Server restarting...
kyrix_1  | Backend server started...
```

## More information
* [Quick-start Tutorial](https://github.com/tracyhenry/Kyrix/wiki/Tutorial)
* [API Reference](https://github.com/tracyhenry/Kyrix/wiki/API-Reference)
* [How to Contribute](https://github.com/tracyhenry/Kyrix/wiki/How-to-Contribute)
* [Parallel Indexing](https://github.com/tracyhenry/Kyrix/wiki/Parallel-Indexing-Instructions)
* [Manual Installation](https://github.com/tracyhenry/Kyrix/wiki/Installation-Details)
* [Docker Config Details](https://github.com/tracyhenry/Kyrix/wiki/Docker-Config-Details)
