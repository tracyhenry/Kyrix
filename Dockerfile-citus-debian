FROM asah/pg11-plv8 as plv8

FROM postgres:11

ARG DEBIAN_FRONTEND=noninteractive

ARG CITUS_VERSION=8.1.1
ENV CITUS_VERSION ${CITUS_VERSION}.citus-1

#
# install postgis
#
ARG PG_MAJOR=11
ARG POSTGIS_MAJOR=2.5
ENV LANG en_ZA.UTF-8
ENV LANGUAGE en_ZA.UTF-8
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
                          postgresql-$PG_MAJOR-postgis-$POSTGIS_MAJOR \
                          postgis-$POSTGIS_MAJOR \
       	       	       	  locales \
    && sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen \
    && sed -i -e 's/# en_ZA.UTF-8 UTF-8/en_ZA.UTF-8 UTF-8/' /etc/locale.gen \
    && echo 'LANG="en_ZA.UTF-8"'>/etc/default/locale \
    && dpkg-reconfigure locales \
    && update-locale LANG=en_ZA.UTF-8 \
    && dpkg-reconfigure locales
    
#    && rm -rf /var/lib/apt/lists/*

#
# install Citus
#
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && curl -s https://install.citusdata.com/community/deb.sh | bash \
    && apt-get install -y postgresql-$PG_MAJOR-citus-8.1=$CITUS_VERSION \
                          postgresql-$PG_MAJOR-hll=2.12.citus-1 \
                          postgresql-$PG_MAJOR-topn=2.2.0 \
    && apt-get purge -y --auto-remove curl \
    && rm -rf /var/lib/apt/lists/*

# add citus to default PostgreSQL config
RUN echo "shared_preload_libraries='citus'" >> /usr/share/postgresql/postgresql.conf.sample && \
    echo "logging_collector = on" >> /usr/share/postgresql/postgresql.conf.sample && \
    echo "log_directory = 'log'" >> /usr/share/postgresql/postgresql.conf.sample && \
    echo "log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'" >> /usr/share/postgresql/postgresql.conf.sample && \
    echo "log_file_mode = 0600" >> /usr/share/postgresql/postgresql.conf.sample && \
    echo "" > /dev/null

# add scripts to run after initdb
# note: 002-create-postgis-extension.sql should only be run in user databases, as per postgis instructions
# (it's also super slow...)
COPY docker-scripts/000-configure-stats.sh docker-scripts/001-create-citus-extension.sql /docker-entrypoint-initdb.d/

# add health check script
COPY docker-scripts/pg_healthcheck /

HEALTHCHECK --interval=4s --start-period=6s CMD ./pg_healthcheck

#
# plv8
#
# plv8 is dynamically linked
RUN apt-get update -qq && apt-get install -qq --no-install-recommends  libc++1 && \
    rm -rf /var/lib/apt/lists/* && apt-get -y autoremove && apt-get clean
COPY --from=plv8 /usr/share/postgresql/11/extension/plcoffee* /usr/share/postgresql/11/extension/
COPY --from=plv8 /usr/share/postgresql/11/extension/plls* /usr/share/postgresql/11/extension/
COPY --from=plv8 /usr/share/postgresql/11/extension/plv8* /usr/share/postgresql/11/extension/
COPY --from=plv8 /usr/lib/postgresql/11/lib/plv8*.so /usr/lib/postgresql/11/lib/
COPY --from=plv8 /var/lib/postgresql/plv8-modules /var/lib/postgresql/plv8-modules
RUN chmod 644 /usr/share/postgresql/11/extension/plcoffee* \
    && chmod 644 /usr/share/postgresql/11/extension/plls* \
    && chmod 644 /usr/share/postgresql/11/extension/plv8* \
    && chmod 755 /usr/lib/postgresql/11/lib/plv8*.so

#COPY ./initdb.sh /docker-entrypoint-initdb.d/postgis.sh

#
# install d3 - requires postgres startup script
#
RUN apt-get -qq update && apt-get install -qq curl && curl -sL https://deb.nodesource.com/setup_11.x | bash - && \
    apt-get install -qq --no-install-recommends nodejs && \
    su - postgres -c "npm install d3" && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get -y autoremove && apt-get clean
    
ADD docker-scripts/plv8_add_module_simple /var/lib/postgresql/plv8-modules/bin/add_module_simple
ADD docker-scripts/install-d3.sh /var/lib/postgresql

# copied from postgres, since it got flattened
#CMD su - postgres -c "/usr/lib/postgresql/11/bin/initdb -D /var/lib/postgresql/data; /usr/lib/postgresql/11/bin/postgres -D /var/lib/postgresql/data"
