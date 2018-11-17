
# Kyrix - Generalized Interactive Panning/Zooming Interfaces

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

The older, manual installation instructions are still available [here](INSTALL.md).


## Usage: adding/changing the dataset

<!-- TODO: this is more of a placeholder until we can be more specific, e.g. how to know if "out of sync" -->

If the underlying data changes and the view is out of sync, run `docker exec -w /kyrix/compiler/examples/nba -it kyrix_kyrix_1 sh -c "psql postgresql://kyrix:kyrix_password@db/kyrix -c \"delete from project where name = 'nba'\"; node nba.js;"`
(where 'nba' is the name of the kyrix dataset and nba.js is the kyrix spec).

TODO: script this and don't hardcode the kyrix db password.


## Kyrix Development: spec compiler changes

If you change package.json, then run `npm install` i.e. `docker exec -w /kyrix/compiler -it kyrix_kyrix_1 npm install`

Otherwise, if you change the compiler code (Node.JS JavaScript), simply re-run the spec compiler on your dataset(s) with `docker exec -w /kyrix/compiler/examples/nba -it kyrix_kyrix_1 node nba.js` (where nba.js is your spec)


## Kyrix Development: tile server changes

If you change the tile server code (Java), then run `mvn compile` and restart the server with `mvn  exec:java -Dexec.mainClass="main.Main"`. From outside docker: `docker exec -w /kyrix/tile-server -it kyrix_kyrix_1 mvn compile` and `docker exec -w /kyrix/tile-server -it kyrix_kyrix_1 sh -c "killall /usr/bin/java; mvn  exec:java -Dexec.mainClass=\"main.Main\""`


## Kyrix Development: frontend static HTML/CSS/JS changes

Just reload your browser, i.e. web static content isn't cached.


## Contributing code/patches/etc.

See [development workflow](https://github.com/tracyhenry/Kyrix/wiki/Development-Workflow).


## Docker config details

tl;dr: docker-compose brings up two VMs that talk with each other and expose port 8000 for
web browsers i.e. end users, and port 5432 for developers using postgres tools like
[psql](https://www.postgresql.org/docs/current/app-psql.html).

The easiest way to run Kyrix is to use our docker-compose config, which creates two docker virtual
machines ("containers") on your local computer - one which runs the kyrix frontend and tile-server
and one which runs the postgres backend.  The Kyrix container exposes port 8000 to the host OS,
i.e. open a terminal and point a browser at localhost:8000 on the host OS. Strictly for
debugging/developments, the postgres container exposes port 5432 so you can connect (e.g. psql)
directly to postgres from the host OS. Again, this is totally optional - the Kyrix container
talks directly to the postgres container, thanks to the magic of docker-compose.

To learn more, read [docker-compose.yml](docker-compose.yml). We rely on docker-compose v3 features,
so please upgrade if you're using an older version.


## FAQ: what is Docker and Docker Compose? How does it work?

tl;dr: Docker makes developers' lives much much easier because everybody has the exact same everything.

Docker works by creating fully isolated virtual machines ("containers") on your computer, making it much
easier to achieve correct installations every time ([learn more](https://opensource.com/resources/what-docker)).
Notably, docker works the same way regardless of the host OS, so developers running MacOS and servers running
Ubuntu, all have the *exact* same OS, libraries, code, data, everything. Under the hood, Docker uses a
complete "container OS" inside the container, and yes this can get "heavy" in terms of storage, networking,
etc which is why we use Alpine Linux by default (but provide Ubuntu for developers as well).

Docker-compose is a tool which scripts the process of starting multiple containers in the proper order,
arrange that the containers can talk (network) to each other, etc. Think of docker-compose as the master
boot script for a cluster of virtual computers.


