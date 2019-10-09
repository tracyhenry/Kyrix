#
# Dockerfile with Ubuntu as the container OS
#
# This is intended for non-prodution experimentation, where Ubuntu is helpful
# because nearly all packages/libraries work "out of the box". Not recommended
# for production due to large package size and downloads - instead consider
# Dockerfile-kyrix-alpine
#

# 18.04 works too, but is even larger
FROM ubuntu:18.04
#FROM ubuntu:16.04

# update Ubuntu and adding basic packages
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get -qq -y update > apt-update.out && apt-get -qq -y upgrade > apt-upgrade.out && \
    apt-get -qq -y install npm postgresql-client postgresql-server-dev-10 maven openjdk-8-jdk git curl wget > apt-get.out && \
    curl -sL https://deb.nodesource.com/setup_8.x | bash > nodejs.out && apt-get -qq -y install nodejs > apt-install-node.out

# copy kyrix source, then work in /root
RUN mkdir -p /kyrix/compiler /kyrix/back-end
ADD ./front-end /kyrix/front-end/
ADD ./compiler /kyrix/compiler/
ADD ./back-end /kyrix/back-end/

# if instead you want to get from git...
#RUN git clone https://github.com/tracyhenry/kyrix > git-clone.out

# setup Kyrix compiler - rebuild node_modules because of native modules
WORKDIR /kyrix/compiler
RUN rm -fr /kyrix/compiler/node_modules && npm install
RUN sed -i 's/\(.\+\equest\)/\/\/\1/' node_modules/d3/build/d3.node.js

# TODO(asah): is this needed?
#cd /kyrix/compiler
#npm rebuild | egrep -v '(@[0-9.]+ /kyrix/compiler/node_modules/)'

COPY docker-scripts/wait-for-postgres docker-scripts/start-kyrix.sh /
RUN chmod 755 /wait-for-postgres /start-kyrix.sh

EXPOSE 8000

# setup backend server
WORKDIR /kyrix/back-end
RUN mvn -B -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn compile | tee mvn-compile.out

ENTRYPOINT sh -c 'sleep 5; /wait-for-postgres ${PGHOST}:5432 -t 60 -- /start-kyrix.sh'
