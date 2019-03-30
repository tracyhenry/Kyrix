#!/bin/sh

KYRIX_DB=${KYRIX_DB:-nba}
KYRIX_DB_TEST_TABLE=${KYRIX_DB_TEST_TABLE:-plays}  # source table (one of...) checked to avoid duplicate loads
KYRIX_DB_TEST_TABLE_MIN_RECS=${KYRIX_DB_TEST_TABLE_MIN_RECS:-500000}  # rarely needs changing: min records to find in test table
KYRIX_DB_LOAD_CMD=${KYRIX_DB_LOAD_CMD:-/kyrix/compiler/examples/nba/reload-nba.sh}

PGHOST=${PGHOST:-db}  # db is the default used in docker-compose.yml
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-kyrixftw}
USER_NAME=${USER_NAME:-kyrix}
USER_PASSWORD=${USER_PASSWORD:-kyrix_password}

PGCONN_STRING_POSTGRES=postgresql://postgres:$POSTGRES_PASSWORD@$PGHOST
PGCONN_STRING_USER=postgresql://$USER_NAME:$USER_PASSWORD@$PGHOST

DBTYPE=${DBTYPE:-psql}  # other option is citus

cd /kyrix
echo $KYRIX_DB > /kyrix/config.txt
echo "8000" >> /kyrix/config.txt
echo $DBTYPE >> /kyrix/config.txt
echo $PGHOST >> /kyrix/config.txt
echo $USER_NAME >> /kyrix/config.txt
echo $USER_PASSWORD >> /kyrix/config.txt
echo "kyrix" >> /kyrix/config.txt
echo "/kyrix/compiler" >> /kyrix/config.txt

IGNORE_RX="(NOTICE|HINT|already exists)"
echo "*** setting up postgres roles/databases..."
psql $PGCONN_STRING_POSTGRES/postgres -c "CREATE USER $USER_NAME WITH SUPERUSER PASSWORD '$USER_PASSWORD';" | egrep -v "$IGNORE_RX" 2>&1 || true
psql $PGCONN_STRING_POSTGRES/postgres -c "CREATE DATABASE kyrix OWNER $USER_NAME;" | egrep -v "$IGNORE_RX" 2>&1 || true
psql $PGCONN_STRING_POSTGRES/postgres -c "CREATE DATABASE $KYRIX_DB OWNER $USER_NAME;" | egrep -v "$IGNORE_RX" 2>&1 || true

# if used, postgis is setup previously in the database - this is to support citus, which needs is initialized on every node
# TODO: throwing errors: CREATE EXTENSION postgis_sfcgal; CREATE EXTENSION address_standardizer;CREATE EXTENSION address_standardizer_data_us;
#EXT_CMD='CREATE EXTENSION IF NOT EXISTS postgis;CREATE EXTENSION IF NOT EXISTS postgis_topology;CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder'
#psql $PGCONN_STRING_USER/kyrix -c "$EXT_CMD" | egrep -v "$IGNORE_RX" 2>&1 || true
#psql $PGCONN_STRING_USER/$KYRIX_DB -c "$EXT_CMD" | egrep -v "$IGNORE_RX" 2>&1 || true

# workaround this issue: https://github.com/tracyhenry/Kyrix/issues/42
psql $PGCONN_STRING_USER/kyrix -c "CREATE TABLE IF NOT EXISTS project (name VARCHAR(255), content TEXT, dirty int, CONSTRAINT PK_project PRIMARY KEY (name));"
psql $PGCONN_STRING_USER/$KYRIX_DB -c "CREATE TABLE IF NOT EXISTS project (name VARCHAR(255), content TEXT, dirty int, CONSTRAINT PK_project PRIMARY KEY (name));"

cd /kyrix/back-end

recs_exists=$(psql $PGCONN_STRING_USER/$KYRIX_DB -X -P t -P format=unaligned -c "select exists(select 1 from information_schema.tables where table_schema='public' and table_name='$KYRIX_DB_TEST_TABLE');" || true)
if [ "$recs_exists" = "t" ]; then
    recs_found=$(psql $PGCONN_STRING_USER/$KYRIX_DB -X -P t -P format=unaligned -c "select count(*)>$KYRIX_DB_TEST_TABLE_MIN_RECS from $KYRIX_DB_TEST_TABLE;" || true)
else
    recs_found=f
fi
if [ "$recs_found" = "t" ]; then
    # if you want to force a reload, the easiest way is to dropdb, e.g.
    #   docker exec -u postgres -it kyrix_db_1 sh -c "dropdb nba"
    # note: requires the database to be running, i.e. let docker-compose finish starting up.
    echo "raw data records found - skipping reload to avoid duplicate records."
else
    # TODO: prints ugly error message the first time
    echo "raw data records not found - loading..."
    $KYRIX_DB_LOAD_CMD | psql $PGCONN_STRING_USER/$KYRIX_DB | egrep -i 'error' || true
    numrecs=$(psql $PGCONN_STRING_USER/$KYRIX_DB -X -P t -P format=unaligned -c "select count(*) from $KYRIX_DB_TEST_TABLE;" || true)
    echo "raw data records loaded: $numrecs"
    recs=$(psql $PGCONN_STRING_USER/$KYRIX_DB -X -P t -P format=unaligned -c "select count(*)>$KYRIX_DB_TEST_TABLE_MIN_RECS from $KYRIX_DB_TEST_TABLE;" || true)
fi

echo "*** starting backend server..."
cd /kyrix/back-end
mvn -Dorg.slf4j.simpleLogger.log.org.apache.maven.cli.transfer.Slf4jMavenTransferListener=warn exec:java -Dexec.mainClass="main.Main" | stdbuf -oL grep -v Downloading: | tee mvn-exec.out &
touch mvn-exec.out
while [ -z "$(egrep 'Done precomputing|Backend server started' mvn-exec.out)" ]; do echo "waiting for backend server"; sleep 5; done

echo "*** (re)configuring for NBA examples to ensure backend server recomputes..."

cd /kyrix/compiler
npm rebuild | egrep -v '(@[0-9.]+ /kyrix/compiler/node_modules/)'
cd /kyrix/compiler/examples/nba_cmv
node nba_cmv.js | egrep -i "error|connected" || true

echo "*** done! Kyrix ready at: http://<host>:8000/  (may need a minute to recompute indexes - watch this log for messages)"

