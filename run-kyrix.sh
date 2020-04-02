#!/bin/bash

# usage:
# --nba: Run the NBA example upon start. You would need to wait the indexing for about a minute.
# --dbport PORT_NUMBER: Specify the host port number of the postgres container.
# --kyrixport PORT_NUMBER: Specify the host port number of the kyrix backend container.
# --postgis: Start the DB container with postgis. You need to either start from scratch or run with --build to let docker rebuild the images.
# --build: Rebuild the docker images before starting.
# --mavenopts: Pass in custom Maven configuration.

echo -e "\nStopping existing containers..."
docker-compose stop
echo -e "Done.\n"

start_time=$(date +%s)
#echo "Current UNIX timestamp: $start_time"

DB_PORT=5432
KYRIX_PORT=8000
START_APP=0
BUILD_STAGE="pg-plv8"
REBUILD=""
KYRIX_MAVEN_OPTS="-Xmx512m"

while [[ $# -gt 0 ]]
do
    key="$1"
    case $key in
        --nba)
            START_APP=1
            shift
            ;;
        --dbport)
            DB_PORT="$2"
            shift
            shift
            ;;
        --kyrixport)
            KYRIX_PORT="$2"
            shift
            shift
            ;;
        --postgis)
            BUILD_STAGE="pg-plv8-postgis"
            shift
            ;;
        --build)
            REBUILD="--build"
            shift
            ;;
        --mavenopts)
            KYRIX_MAVEN_OPTS="$2"
            shift
            shift
            ;;
        *)
            echo "Wrong argument name $key"
            exit
            ;;
    esac
done

START_APP=$START_APP DB_PORT=$DB_PORT KYRIX_PORT=$KYRIX_PORT BUILD_STAGE=$BUILD_STAGE KYRIX_MAVEN_OPTS=$KYRIX_MAVEN_OPTS docker-compose up $REBUILD -d

source docker-scripts/spinner.sh
# waiting for kyrix_db_1 to start
while [ 1 ]; do
    if docker logs 2>&1 --since $start_time kyrix_db_1 | grep -q "LOG:  database system is ready to accept connections"; then
        break;
    fi;
    spin "waiting for the Postgres container to start (be patient, it might take a few minutes)..."
done

# Tune postgres
echo -e "\nPostgres started! Tuning..."
docker exec -t kyrix_db_1 su - postgres -c "psql -c \"create database kyrix;\" " # shutup start_proc warning
docker exec -t kyrix_db_1 su - postgres -c "psql -c \"create extension if not exists plv8;\" " # shutup start_proc warning

# installing d3
docker exec -it kyrix_db_1 su - postgres -c "./install-d3.sh kyrix" > /dev/null
echo -e "Done.\n"

# waiting for kyrix back-end to start
spin_msg_printed=0
while [ 1 ]; do
    if docker logs 2>&1 --since $start_time kyrix_kyrix_1 | grep -q "Backend server started"; then
        break;
    fi;
    spin "waiting for Kyrix backend to start..."
done

# redirect to docker logs
echo -e "\nKyrix back-end started! Redirecting to Kyrix backend logs...\n"
sleep 1
docker logs --since $start_time kyrix_kyrix_1 -f
