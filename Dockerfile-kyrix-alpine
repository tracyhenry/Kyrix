#
# Dockerfile with Alpine Linux as the container OS
#
# This is intended for prodution and network/storage sensitive environments,
# and saves 700+MB per instance. For example, in CI/CD alpine downloads,
# installs and boots much faster than Ubuntu.  Alpine is not great for
# development or experimentation and is missing many helpful debugging tools
# (which you can manually install via "docker exec ...")
#

# start with alpine and node
FROM node:8-alpine

# coreutils provides stdbuf; --update nodejs required to get npm
RUN apk add --no-cache --virtual .build-dependencies -q --update \
    nodejs nodejs-npm postgresql-client maven curl wget git openjdk8 coreutils python bash nss perl

# optional: uncomment if instead you want to get from git...
#RUN git clone https://github.com/tracyhenry/kyrix > git-clone.out

# copying kyrix source, then working in /root
RUN mkdir -p /kyrix/compiler /kyrix/back-end /kyrix/front-end
ADD ./front-end /kyrix/front-end/

# setup Kyrix compiler
ADD ./compiler /kyrix/compiler/
WORKDIR /kyrix/compiler
RUN rm -fr /kyrix/compiler/node_modules && npm install
# workaround.  Note that alpine's sh requires different escapification vs ubuntu
RUN sed -i 's/\(.\+equest\)/\/\/\1/g' node_modules/d3/build/d3.node.js

# setup backend server - uncomment >/dev/null for debugging
ADD ./back-end /kyrix/back-end/
WORKDIR /kyrix/back-end
RUN mvn -B -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn compile | tee mvn-compile.out >/dev/null 2>&1
RUN mvn -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn exec:java -Dexec.mainClass="main.Main" -Dexec.args="--immediate-shutdown"

ADD ./docker-scripts /kyrix/docker-scripts/
COPY docker-scripts/wait-for-postgres docker-scripts/start-kyrix.sh /
RUN chmod 755 /wait-for-postgres /start-kyrix.sh

EXPOSE 8000

# https://stackoverflow.com/questions/31870222/how-can-i-keep-a-container-running-on-kubernetes
ENTRYPOINT exec /bin/sh -c "trap : TERM INT; (while true; do sleep 10000; done) & wait"

# override in kubernetes yaml with something like this
# ENTRYPOINT sh -c 'sleep 5; PGHOST=${PGHOST} POSTGRES_PASSWORD=${PGPASS} USER_PASSWORD=${KYRIX_PASSWORD} /wait-for-postgres ${PGHOST}:5432 -t 60 -- /start-kyrix.sh'

