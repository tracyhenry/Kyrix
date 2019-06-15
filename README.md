
# Kyrix - Interactive Pan/zoom Data Visualizations at Scale

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

## Parallel indexing with multiple cores and multiple computers (10,000+ cores)

For larger datasets, indexing becomes problematic and requires parallelism to scale. For example, in one test it took 10 hours to index 100 million small records totalling 60GB. Fortunately, Kyrix can index data in parallel and scales up both with more cores per computer and multiple computers - we've tested Kyrix up to 640 cores (20 nodes, 32 cores each) and achieved near-linear scaling, with CREATE INDEX achieving super-linear scaling due to increased RAM across the cluster. On that system, it took around 12 minutes to index 1 billion records (~500x speedup). Theoretically, Kyrix scales infinitely with this architecture - in practice, many of the cluster administration tools/scripts are executed sequentialy, and as you scale past 1,000 cores you get "tail latency" due to random stalls and errors. We currently recommend Citus up to 50-100 machines "comfortably" and perhaps 250-1000 with difficulty.

For more information, checkout [parallel indexing instructions](https://github.com/tracyhenry/Kyrix/wiki/Parallel-Indexing-Instructions). 

## More information
* [Quick-start Tutorial](https://github.com/tracyhenry/Kyrix/wiki/Tutorial)
* [API Reference](https://github.com/tracyhenry/Kyrix/wiki/API-Reference)
* [How to Contribute](https://github.com/tracyhenry/Kyrix/wiki/How-to-Contribute)
* [Parallel Indexing](https://github.com/tracyhenry/Kyrix/wiki/Parallel-Indexing-Instructions)
* [Manual Installation](https://github.com/tracyhenry/Kyrix/wiki/Installation-Details)
* [Docker Config Details](https://github.com/tracyhenry/Kyrix/wiki/Docker-Config-Details)
