#!/bin/sh

echo "*** setting up postgres roles/databases..."
psql postgresql://postgres:$POSTGRES_PASSWORD@db/postgres -c "CREATE USER kyrix WITH SUPERUSER PASSWORD 'kyrix_password';" || true
psql postgresql://postgres:$POSTGRES_PASSWORD@db/postgres -c "CREATE DATABASE kyrix OWNER kyrix;" || true
psql postgresql://postgres:$POSTGRES_PASSWORD@db/postgres -c"CREATE DATABASE nba OWNER kyrix;" || true

# TODO: throwing errors: CREATE EXTENSION postgis_sfcgal; CREATE EXTENSION address_standardizer;CREATE EXTENSION address_standardizer_data_us;
psql postgresql://kyrix:kyrix_password@db/kyrix -c "CREATE EXTENSION postgis;CREATE EXTENSION postgis_topology;CREATE EXTENSION fuzzystrmatch;CREATE EXTENSION postgis_tiger_geocoder;" || true
psql postgresql://kyrix:kyrix_password@db/nba -c "CREATE EXTENSION postgis;CREATE EXTENSION postgis_topology;CREATE EXTENSION fuzzystrmatch;CREATE EXTENSION postgis_tiger_geocoder;" || true

echo "*** restoring NBA data to database..."
cat nba_db_psql.sql | grep -v idle_in_transaction_session_timeout | psql postgresql://kyrix:kyrix_password@db/nba | egrep -i 'error' || true

cd /kyrix/compiler/examples/nba
echo "*** configuring for NBA examples - OK to ignore connection refused errors"
node nba.js | egrep -i "error|connected" || true

echo "*** starting tile server..."
cd /kyrix/tile-server
mvn exec:java -Dexec.mainClass="main.Main" | tee mvn-exec.out &
touch mvn-exec.out
while [ -z "$(egrep 'Tile server started' mvn-exec.out)" ];do echo "waiting for tile server";sleep 5;done

echo "*** (re)configuring for NBA examples to ensure tile server recomputes..."
cd /kyrix/compiler/examples/nba
node nba.js | egrep -i "error|connected" || true

echo "*** done! Kyrix is ready: visit http://<host>:8000/"

# keep mvn exec running in background, don't exit container
tail -f /dev/null
