
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

At this time, only the "dots" synthetic dataset supports parallel indexing "out of the box," ([dots-uniform-pushdown](/compiler/examples/dots-pushdown-uniform)) though you can adapt it to other data sets. There are two issues: (1) the "getBBoxCoordinates" is hardcoded - see bboxfunc in [PsqlNativeBoxIndexer.java](/back-end/src/main/java/index/PsqlNativeBoxIndexer.java). (2) the [reload-dots-pushdown-uniform.sh](/compiler/examples/dots-pushdown-uniform/reload-dots-pushdown-uniform.sh) script needs to be adapted for your dataset. (3) though it's not directly related to parallelism, the transform.js function must be carefully coded to avoid bottlenecking on JavaScript - see [transforms.js](https://github.com/tracyhenry/Kyrix/blob/distribute_citus/compiler/examples/dots-pushdown-uniform/transforms.js) for an example.

Kyrix serving is not parallelized at this time, and indeed the system overhead of coordinating queries can lead to substantial latency (800-2000msec in our tests). It's current work and open research on how to improve this - we believe there are ways to reduce the fixed overhead per-query for pan/zoom operations, such as sharding by canvas location (x/y) and then "skipping" the coordinator node and querying the shards directly from the Kyrix server.

Parallel Kyrix is implemented using [Kubernetes on Google Cloud](https://cloud.google.com/kubernetes-engine/) for orchestration and the [Citus Postgres extension](https://citusdata.com) to provide parallel query/update/DDL. It would be straightforward to port this to other Kubernetes providers. To execute the JavaScript transform function inside Postgres (and avoid bottlenecking on the Kyrix middleware), we use [plv8](https://www.google.com/search?q=plv8), though you could (in theory) run multiple Kyrix middleware servers.

To use parallel Kyrix, you will need a Kubernetes cluster provider - these instructions are for Google Cloud.

1. install kubectl  (e.g. `sudo snap install kubectl --classic` - [kubectl docs](https://kubernetes.io/docs/tasks/tools/install-kubectl/))
2. setup kubectl to the given cluster (e.g. `gcloud container clusters get-credentials <cluster name>` - [gcloud install instructions](https://cloud.google.com/sdk/docs/downloads-apt-get))
3. run `./redeploy-citus; ./redeploy-kyrix-server` then wait for "Backend server started..." (see above)
4. look for "Kyrix running; run 'source setup-kyrix-vars.env' for convenience scripts/functions or visit http://<ipaddr>:8000/
5. point a browser at this URL - for most kubernetes providers, no firewall changes should be required.
6. to load the larger 'dots' dataset, run a command like this: SCALE=1 KYRIX_DB_RELOAD_FORCE=1  DATA=dots-pushdown-uniform ./restart-kyrix-server.sh
(SCALE multiplies the dataset by this amount - start with SCALE=1, then try SCALE=10 etc)
7. reload your browser, you should see dots.  If you don't, it could be that the density is too low - either increase SCALE or modify dots.js to reduce the canvas size.

note: the Kyrix indexing pipeline automatically detects the number of machine instances and cores per machine, and sets the number of Citus "shards" (Postgres tables) to one per core, i.e. if you use 96-core machines, then you will find 96 PostgreSQL tables on each machine in the one database.


## More information
* [Quick-start Tutorial](https://github.com/tracyhenry/Kyrix/wiki/Tutorial)
* [API Reference](https://github.com/tracyhenry/Kyrix/wiki/API-Reference)
* [How to Contribute](https://github.com/tracyhenry/Kyrix/wiki/How-to-Contribute)
* [Manual Installation](https://github.com/tracyhenry/Kyrix/wiki/Installation-Details)
* [Docker Config Details](https://github.com/tracyhenry/Kyrix/wiki/Docker-Config-Details)
