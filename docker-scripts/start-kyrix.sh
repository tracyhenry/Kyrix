#!/bin/bash

echo "no" > /kyrix-started

source /kyrix/docker-scripts/spinner.sh

SRCDATA_PROJECT_NAME=${SRCDATA_PROJECT_NAME:-nba}
SRCDATA_DB=${SRCDATA_DB:-nba}
SRCDATA_DB_TEST_TABLE=${SRCDATA_DB_TEST_TABLE:-plays}  # source table (one of...) checked to avoid duplicate loads
SRCDATA_DB_TEST_TABLE_MIN_RECS=${SRCDATA_DB_TEST_TABLE_MIN_RECS:-500000}  # rarely needs changing: min records to find in test table
SRCDATA_DB_LOAD_CMD=${SRCDATA_DB_LOAD_CMD:-/kyrix/compiler/examples/nba/reload-nba.sh}
KYRIX_DB_INDEX_CMD=${KYRIX_DB_INDEX_CMD:-/kyrix/compiler/examples/nba/reindex-nba.sh}
KYRIX_DB_INDEX_FORCE=${KYRIX_DB_INDEX_FORCE:-0}
KYRIX_DB_RELOAD_FORCE=${KYRIX_DB_RELOAD_FORCE:-0}

PGHOST=${PGHOST:-db}  # db is the default used in docker-compose.yml
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-kyrixftw}
USER_NAME=${USER_NAME:-kyrix}
USER_PASSWORD=${USER_PASSWORD:-kyrix_password}

PGCONN_STRING_POSTGRES=postgresql://postgres:$POSTGRES_PASSWORD@$PGHOST
PGCONN_STRING_USER=postgresql://$USER_NAME:$USER_PASSWORD@$PGHOST

DBTYPE=${DBTYPE:-psql}  # other option is citus

KYRIX_DB=${KYRIX_DB:-kyrix}

cd /kyrix
echo $SRCDATA_PROJECT_NAME > /kyrix/config.txt
echo "8000" >> /kyrix/config.txt
echo $DBTYPE >> /kyrix/config.txt
echo $PGHOST >> /kyrix/config.txt
echo $USER_NAME >> /kyrix/config.txt
echo $USER_PASSWORD >> /kyrix/config.txt
echo $KYRIX_DB >> /kyrix/config.txt
echo "/kyrix/compiler" >> /kyrix/config.txt

IGNORE_RX="(NOTICE|HINT|already exists)"
echo "*** setting up postgres roles/databases on master..."
psql $PGCONN_STRING_POSTGRES/postgres -c "CREATE USER $USER_NAME WITH SUPERUSER PASSWORD '$USER_PASSWORD';" | egrep -v "$IGNORE_RX" 2>&1 || true
# TOOD(citus): if kyrix is missing, we actually need to create on every node... currently, this is handled by redeploy-citus
psql $PGCONN_STRING_POSTGRES/postgres -c "CREATE DATABASE kyrix OWNER $USER_NAME;" | egrep -v "$IGNORE_RX" 2>&1 || true

# if used, postgis is setup previously in the database - this is to support citus, which needs is initialized on every node
# TODO: throwing errors: CREATE EXTENSION postgis_sfcgal; CREATE EXTENSION address_standardizer;CREATE EXTENSION address_standardizer_data_us;
#EXT_CMD='CREATE EXTENSION IF NOT EXISTS postgis;CREATE EXTENSION IF NOT EXISTS postgis_topology;CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder'
#psql $PGCONN_STRING_USER/kyrix -c "$EXT_CMD" | egrep -v "$IGNORE_RX" 2>&1 || true
#psql $PGCONN_STRING_USER/$SRCDATA_DB -c "$EXT_CMD" | egrep -v "$IGNORE_RX" 2>&1 || true

# loading the data for example app if 1) app is set to NBA, i.e. it is single-node docker; or 2) START_APP is set to 1
if [ "x$START_APP" = "x1" ] || [ "x$SRCDATA_PROJECT_NAME" = "xnba" ]; then
    # citus: this data isn't distributed, so these DBs
    psql $PGCONN_STRING_POSTGRES/postgres -c "CREATE DATABASE $SRCDATA_DB OWNER $USER_NAME;" | egrep -v "$IGNORE_RX" 2>&1 || true

    recs_exists=$(psql $PGCONN_STRING_USER/$SRCDATA_DB -X -P t -P format=unaligned -c "select exists(select 1 from information_schema.tables where table_schema='public' and table_name='$SRCDATA_DB_TEST_TABLE');")
    if [ "$recs_exists" = "t" ]; then
        recs_found=$(psql $PGCONN_STRING_USER/$SRCDATA_DB -X -P t -P format=unaligned -c "select count(*)>$SRCDATA_DB_TEST_TABLE_MIN_RECS from $SRCDATA_DB_TEST_TABLE;")
    else
        recs_found=f
    fi
    if [ "$recs_found" = "t" ] && [ "x$KYRIX_DB_RELOAD_FORCE" = "x0" ]; then
        # if you want to force a reload, the easiest way is to dropdb, e.g.
        #   docker exec -u postgres -it kyrix_db_1 sh -c "dropdb nba"
        # note: requires the database to be running, i.e. let docker-compose finish starting up.
        echo "raw data records found - skipping reload to avoid duplicate records."
    else
        # TODO: prints ugly error message the first time
        echo "raw data records not found - loading... PGCONN=$PGCONN_STRING_USER/$SRCDATA_DB loadcmd=$SRCDATA_DB_LOAD_CMD testing $SRCDATA_DB_TEST_TABLE"
        PGCONN=$PGCONN_STRING_USER/$SRCDATA_DB $SRCDATA_DB_LOAD_CMD
        numrecs=$(psql $PGCONN_STRING_USER/$SRCDATA_DB -X -P t -P format=unaligned -c "select count(*) from $SRCDATA_DB_TEST_TABLE;")
        echo "raw data records loaded: $numrecs"
        # TODO(asah): test for >SRCDATA_DB_TEST_TABLE_MIN_RECS
    fi
fi

# cleanup maven opts
sed -i '/MAVEN_OPTS/s/.*/MAVEN_OPTS='$KYRIX_MAVEN_OPTS'/' /etc/mavenrc

# starting the backend
cd /kyrix/back-end

while [ 1 ]; do KYRIX_PID=`ps awwwx | grep Slf4jMavenTransferListener | grep -v grep | head -1 | awk '{print $1}' | tr -d '\n'`; if [ "x$KYRIX_PID" == "x" ]; then break; fi; spin "backend server found - killing $KYRIX_PID..."; kill $KYRIX_PID; sleep 1; done

echo "*** starting backend server..."
cd /kyrix/back-end
mvn -B -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn compile | tee mvn-compile.out >/dev/null 2>&1
rm -f mvn-exec.out && touch mvn-exec.out
mvn -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn exec:java -Dexec.mainClass="main.Main" | stdbuf -oL grep -v Downloading: | tee mvn-exec.out &
# note(asah): limited grep behavior inside alpine/busybox, but still this is awkward due to my limited shell scripting skills.
while [ 1 ]; do if grep -E -q 'Done precomputing|Backend server started' mvn-exec.out; then break; fi; spin "waiting for backend server"; sleep 1; done

# indexing the app if START_APP is set to 1
if [ "x$START_APP" = "x1" ]; then
    echo "*** (re)indexing (force=$KYRIX_DB_INDEX_FORCE)..."
    FORCE=$KYRIX_DB_INDEX_FORCE $KYRIX_DB_INDEX_CMD || true

    sql="select dirty from project where name='$SRCDATA_PROJECT_NAME';"
    echo "sql=$sql"
    cmd="psql $PGCONN_STRING_USER/kyrix -X -P t -P format=unaligned -c \"$sql\""
    echo "cmd=$cmd"
    while [ 1 ]; do
        w=$(psql $PGCONN_STRING_USER/$KYRIX_DB -X -P t -P format=unaligned -c "select dirty from project where name='$SRCDATA_PROJECT_NAME';") || -1;
        if [ "x$w" = "x0" ]; then break; fi;
        spin "waiting for kyrix re-index, currently dirty=$w"
    done
    echo "yes" > /kyrix-started

    if [ "x$DBTYPE" = "xpsql" ]; then
        KYRIX_IP=$(curl -s ifconfig.me)
    fi

    echo "*** done! Kyrix ready at: http://$KYRIX_IP:${KYRIX_PORT:-8000}/"
fi
