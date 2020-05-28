# Kyrix - Democratizing details-on-demand data visualizations


![version](https://img.shields.io/badge/release-v1.0.0--beta-orange) 
![Build status](https://travis-ci.org/tracyhenry/Kyrix.svg?branch=master) [![code style: 
prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier) [![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?)](https://github.com/tracyhenry/Kyrix/blob/master/LICENSE) [![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/tracyhenry/Kyrix/wiki/How-to-Contribute)


<p align="center">
  <img src="https://github.com/tracyhenry/Kyrix-gallery/blob/master/gallery.gif" width="700" />
</p>

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

Getting started by reading a [tutorial](https://github.com/tracyhenry/Kyrix/wiki/Tutorial). 

## Setup-free big data visualizations
Kyrix is fully dockerized, with a live PostgreSQL database running right after docker startup. Front-end vis libraries often assume data fits in browser memory, and thus scale to only small data. By working with a database, Kyrix scales to much larger data while being free of the hassle of installing and maintaining databases. 

Docker works by creating fully isolated virtual machines ("containers") on your computer, making it much
easier to achieve correct installations every time ([learn more](https://opensource.com/resources/what-docker)). See [docker config details](https://github.com/tracyhenry/Kyrix/wiki/Docker-Config-Details). 

## Declarative authoring
Kyrix offers two declarative grammars for authoring complex details-on-demand visualizations. [Low-level Kyrix grammar](https://github.com/tracyhenry/Kyrix/wiki/API-Reference) is verbose but expressive. [Kyrix-S grammar](https://github.com/tracyhenry/Kyrix/wiki/Kyrix%E2%80%90S-API-Reference) is a high-level and concise grammar designed for zoomable scatterplot visualizations. For example, Kyrix-S turns
```javascript
{
    data: {  
        db: "nba",  
        query: “SELECT * FROM games"  
    },  
    layout: {  
        x: {  
            field: "home_score",  
            extent: [69, 149]  
        },  
        y: {  
            field: "away_score",  
            extent: [69, 148]  
        },  
        z: {  
            field: "agg_rank",  
            order: "asc"  
        }  
    },  
    marks: {  
        cluster: {  
            mode: "circle"
        },  
        hover: {  
            rankList: {  
                mode: "tabular",  
                fields: ["home_team", "away_team", "home_score", "away_score"],  
                topk: 3  
            },  
            boundary: "convexhull"  
         }  
    },  
    config: {  
        axis: true  
    }  
};
```
into
<p align="center">
<a href="https://github.com/tracyhenry/Kyrix/tree/master/compiler/examples/nba_cmv">
<img src="https://media.giphy.com/media/d7xqGWf1Q4sftNOuZd/giphy.gif" width = "375"/>
</a>
</p>

## Embedding into your favourite web app
Kyrix offers [APIs](https://github.com/tracyhenry/Kyrix/wiki/Web-Embedding) to integrate a kyrix application into a web application. There's no limit on what you can imagine: complex coordinated views, programmatic pan/zoom control, cross filtering...  


## Contributing to Kyrix
We welcome contributions! Please let us know about your change beforehand if it is big. Also, see [contributing guidelines](https://github.com/tracyhenry/Kyrix/wiki/How-to-Contribute). 

Kyrix is maintained by a group of researchers at [MIT's data system group](http://dsg.csail.mit.edu/). The system is not possible without the contribution from the these wonderful developers:
<table>
  <tr>
    <td align="center"><a href="https://github.com/tracyhenry"><img src="https://avatars2.githubusercontent.com/u/5410441?s=460&v=4" width="70px;" alt=""/><br /><sub><b>Wenbo Tao</b></sub></a><br /></td>
    <td align="center"><a href="https://github.com/asah"><img src="https://avatars3.githubusercontent.com/u/140002?s=400&v=4" width="70px;" alt=""/><br /><sub><b>Adam Sah</b></sub></a><br /></td>
    <td align="center"><a href="https://github.com/houxinli"><img src="https://avatars2.githubusercontent.com/u/23057640?s=460&u=9a5f5bb1fef5b1ea70b04157827ec6d9da0438d5&v=4" width="70px;" alt=""/><br /><sub><b>Xinli Hou</b></sub></a><br /></td>
    <td align="center"><a href="https://github.com/xiaoyu4321"><img src="https://avatars1.githubusercontent.com/u/29280476?s=460&u=446b5fec827ab6a6b1873b7f064cb4278b0c0179&v=4" width="70px;" alt=""/><br /><sub><b>Xiaoyu Liu</b></sub></a><br /></td>
    <td align="center"><a href="https://github.com/yediwang"><img src="https://avatars0.githubusercontent.com/u/31806079?s=460&u=569fb50cd58c0033932381f513f703e1f2dcca36&v=4" width="70px;" alt=""/><br /><sub><b>Yedi Wang</b></sub></a><br /></td>
    <td align="center"><a href="https://github.com/peterg17"><img src="https://avatars1.githubusercontent.com/u/2456071?s=460&u=4996c118f8e54c76c8c10839d6992cad3e6fdf5b&v=4" width="70px;" alt=""/><br /><sub><b>Peter Griggs</b></sub></a><br /</td>
  </tr>
  <tr>
        <td align="center"><a href="https://github.com/mschoema"><img src="https://avatars0.githubusercontent.com/u/32960718?s=460&v=4" width="70px;" alt=""/><br /><sub><b>Maxime Schoemans</b></sub></a><br /></td>
    <td align="center"><a href="https://github.com/ericazhou7"><img src="https://avatars3.githubusercontent.com/u/37673328?s=460&v=4" width="70px;" alt=""/><br /><sub><b>Erica Zhou</b></sub></a><br /></td>
    <td align="center"><a href="https://github.com/abhishek-bassan"><img src="https://avatars0.githubusercontent.com/u/7061250?s=460&v=4" width="70px;" alt=""/><br /><sub><b>Abhishek Bassan</b></sub></a><br /></td>
    <td align="center"><a href="https://github.com/ScarlettZ98"><img src="https://avatars3.githubusercontent.com/u/31007583?s=460&u=ab9b1b1720de52a06259757a1dd0331a879bbabc&v=4" width="70px;" alt=""/><br /><sub><b>Scarlett Zhang</b></sub></a><br /></td>
    <td align="center"><a href="https://github.com/amyzhaang"><img src="https://avatars3.githubusercontent.com/u/26984692?s=460&v=4" width="70px;" alt=""/><br /><sub><b>Amy Zhang</b></sub></a><br /></td>
    <td align="center"><a href="https://github.com/jperaino"><img src="https://avatars0.githubusercontent.com/u/7572179?s=460&u=6d57f8dd49e1c1cdf0f9ce42bb33803f8d777348&v=4" width="70px;" alt=""/><br /><sub><b>Jim Peraino</b></sub></a><br /></td>

  </tr>
  
</table>

## Disclaimer
The current repo contains research-quality code, and is intended for demo purposes. The code should not be used for large-scale secure serving. Currently, `v1.0.0-beta` only supports data up to 10~100 millions of data points. We plan to release a distributed version of Kyrix in the future. 



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
