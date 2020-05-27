# Kyrix - Democratizing details-on-demand data visualizations


![version](https://img.shields.io/badge/release-v1.0.0--beta-orange) 
![Build status](https://travis-ci.org/tracyhenry/Kyrix.svg?branch=master) [![code style: 
prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier) [![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?)](https://github.com/tracyhenry/Kyrix/blob/master/LICENSE) [![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/tracyhenry/Kyrix/wiki/How-to-Contribute)


<p align="center">
  <img src="https://github.com/tracyhenry/Kyrix-gallery/blob/master/gallery.gif" width="700" />
</p>

# About
Kyrix facilitates the creation of data visualizations with details-on-demand interactions (e.g. pan and zoom, see example demos above). In visualizations of such, the underlying dataset is often large. To deal with large data, Kyrix is focused on optimizing two goals: 1) usable declarative API library for visualization developers and 2) 500ms response time to user interactions, which is required to enable interactive browsing. 

## Installation instructions for the impatient

1. Install [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/) (must be `v1.17.0` or later). For Mac users, installing [Docker Desktop](https://docs.docker.com/docker-for-mac/install/) will install Docker Compose automatically. Ubuntu 18.04 users can also simply install with `sudo apt update; sudo apt install -y docker.io docker-compose;`.
2. Run `sudo ./run-kyrix.sh --nba` in the root directory. You might need to make `run-kyrix.sh` executable, i.e. `sudo chmod +x run-kyrix.sh`.  
3. Wait a couple minutes, then point your browser at <ip address>:8000 - remember that if you are using a cloud instance you may (probably) need to open your cloud provider's firewall for this port. If that sounds scary, you can create an SSH tunnel from your PC (e.g. Mac) using `ssh -N <server ipaddr> -L 8000:<same ipaddr>:8000` to forward your laptop's port 8000 to the server via [SSH tunneling](https://www.tecmint.com/create-ssh-tunneling-port-forwarding-in-linux/). 

note that you'll need to wait for a message saying `Backend server started...` like this:
```
Serving /project
New project definition coming...
There is diff that requires recomputing indexes. Shutting down server and recomputing...
Precomputing...
Done precomputing!
Completed recomputing indexes. Server restarting...
Backend server started...
*** done! Kyrix ready at: http://<host>:8000/
```

## More information
* [Quick-start Tutorial](https://github.com/tracyhenry/Kyrix/wiki/Tutorial)
* [API Reference](https://github.com/tracyhenry/Kyrix/wiki/API-Reference)
* [How to Contribute](https://github.com/tracyhenry/Kyrix/wiki/How-to-Contribute)
* [Parallel Indexing](https://github.com/tracyhenry/Kyrix/wiki/Parallel-Indexing-Instructions)
* [Web Embedding](https://github.com/tracyhenry/Kyrix/wiki/Web-Embedding)
* [Docker Config Details](https://github.com/tracyhenry/Kyrix/wiki/Docker-Config-Details)

## Citing Kyrix
```bibtex
@inproceedings{tao2019kyrix,
  title={Kyrix: Interactive pan/zoom visualizations at scale},
  author={Tao, Wenbo and Liu, Xiaoyu and Wang, Yedi and Battle, Leilani and Demiralp, {\c{C}}a{\u{g}}atay and Chang, Remco and Stonebraker, Michael},
  booktitle={Computer Graphics Forum},
  volume={38},
  number={3},
  pages={529--540},
  year={2019},
  organization={Wiley Online Library}
}
```
