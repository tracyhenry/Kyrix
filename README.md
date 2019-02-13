
# Kyrix - Generalized Interactive Panning/Zooming Visualizations

![Build status](https://travis-ci.org/tracyhenry/Kyrix.svg?branch=master)

<p float="left">
  <img src="https://github.com/tracyhenry/Kyrix/blob/master/img/usmap_demo.gif" width="400" />
  <img src="https://github.com/tracyhenry/Kyrix/blob/master/img/forest_demo.gif" width="400" height="209.33"/>
  <img src="https://github.com/tracyhenry/Kyrix/blob/master/img/nba_demo.gif" width="400" height="309.33" />
  <img src="https://github.com/tracyhenry/Kyrix/blob/master/img/flare_demo.gif" width="400"/>
</p>

## Installation instructions for the impatient

1. create a cloud-hosted Ubuntu 18.04 instance (Google, AWS, Azure, DigitalOcean, etc) with 4+ GB RAM, 2-4+ cores and 10+ GB disk.
2. ssh to it.
3. run `sudo apt update; sudo apt install -y docker.io docker-compose; sudo docker-compose up`
4. wait 15-20 minutes, then point your browser at <ip address>:8000 - remember that you may (probably) need to open your cloud provider's firewall for this port. If that sounds scary, you can create an SSH tunnel from your PC (e.g. Mac) using `ssh -N <server ipaddr> -L 8000:<same ipaddr>:8000` to forward your laptop's port 8000 to the server via [SSH tunneling](https://www.tecmint.com/create-ssh-tunneling-port-forwarding-in-linux/).

note that you'll need to wait for a message saying `Tile server started...` like this:
```
kyrix_1  | Serving /project
kyrix_1  |  New project definition coming...
kyrix_1  | There is diff that requires recomputing indexes. Shutting down server and recomputing...
kyrix_1  | Precomputing...
kyrix_1  | *** done! Kyrix ready at: http://<host>:8000/  (may need a minute to recompute indexes - watch this log for messages)
kyrix_1  | Done precomputing!
kyrix_1  | Completed recomputing indexes. Server restarting...
kyrix_1  | Tile server started...
```

## Installation for database clusters via Kubernetes (Google Cloud) and CitusDB

You will need a Kubernetes cluster provider - these instructions are for Google Cloud. [Learn more about CitusDB](https://citusdata.com/)

1. install kubectl  (e.g. `sudo snap install kubectl --classic` - [kubectl docs](https://kubernetes.io/docs/tasks/tools/install-kubectl/))
2. setup kubectl to the given cluster (e.g. `gcloud container clusters get-credentials <cluster name>` - [gcloud install instructions](https://cloud.google.com/sdk/docs/downloads-apt-get))
3. run `./redeploy-citus; ./redeploy-kyrix-server` then wait for "Tile server started..." (see above)
4. look for "Kyrix running; run 'source setup-kyrix-vars.env' for convenience scripts/functions or visit http://<ipaddr>:8000/
5. point a browser at this URL - for most kubernetes providers, no firewall changes should be required.

coming soon: parallel speedups; admin instructions for citus clusters.

## More information
* [Quick-start Tutorial](https://github.com/tracyhenry/Kyrix/wiki/Tutorial)
* [API Reference](https://github.com/tracyhenry/Kyrix/wiki/API-Reference)
* [How to Contribute](https://github.com/tracyhenry/Kyrix/wiki/How-to-Contribute)
* [Manual Installation](https://github.com/tracyhenry/Kyrix/wiki/Installation-Details)
* [Docker Config Details](https://github.com/tracyhenry/Kyrix/wiki/Docker-Config-Details)
