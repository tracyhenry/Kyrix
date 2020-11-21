#!/bin/bash

usage="
run-kyrix.sh: a script to start Kyrix docker containers. Usage:
    --help: show usage.
    --nba: run the NBA example upon start. You would need to wait the indexing for about a minute.
    --dbport PORT_NUMBER: specify the host port number of the postgres container. Default 5432.
    --kyrixport PORT_NUMBER: specify the host port number of the kyrix backend container. Default 8000.
    --postgis: start the DB container with postgis. You need to either start from scratch or run with --build to let docker rebuild the images.
    --build: rebuild the docker images before starting.
    --mavenopts: pass in custom Maven configuration. Default sets memory to 512MB.
    --stop: stop the containers.
    --down: remove containers, the network and volumes."

DB_PORT=5432
KYRIX_PORT=8000
START_APP=0
BUILD_STAGE="pg-plv8"
REBUILD=""
KYRIX_MAVEN_OPTS="-Xmx512m"
STOP=0
DOWN=0

while [[ $# -gt 0 ]]
do
    key="$1"
    case $key in
        -h|--help)
            echo "$usage"
            exit
            ;;
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
        --stop)
            STOP=1
            shift
            ;;
        --down)
            DOWN=1
            shift
            ;;
        *)
            echo "Wrong argument name $key"
            exit
            ;;
    esac
done

echo -e "\nStopping existing containers..."
docker-compose -p kyrix stop
echo -e "Done.\n"

start_time=$(date +%s)
#echo "Current UNIX timestamp: $start_time"

# stop
if [ "x$STOP" = "x1" ]; then
    exit
fi

# down
if [ "x$DOWN" = "x1" ]; then
    echo -e "\nRemoving containers and networks..."
    docker-compose -p kyrix down -v
    echo -e "Done.\n"
    exit
fi

START_APP=$START_APP DB_PORT=$DB_PORT KYRIX_PORT=$KYRIX_PORT BUILD_STAGE=$BUILD_STAGE KYRIX_MAVEN_OPTS=$KYRIX_MAVEN_OPTS docker-compose -p kyrix up $REBUILD -d

source docker-scripts/spinner.sh
pg_start_time=$(date +%s)
# waiting for kyrix_db_1 to start
while [ 1 ]; do
    if docker logs 2>&1 --since $start_time kyrix_db_1 | grep -q "LOG:  database system is ready to accept connections"; then
        break;
    fi;
    spin "waiting for the Postgres container to start (be patient, it might take a few minutes)..."
    cur_time=$(date +%s)
    if [ $((cur_time - pg_start_time)) -gt 180 ]; then
        echo -e "\nPostgres has taken more than 3 minutes to start, which is not normal."
        echo "Try run 'sudo docker logs kyrix_db_1' in a separate terminal tab to inspect docker logs."
        echo "If the log looks like there is an error, you should clean up docker (sudo ./run-kyrix.sh --down) and then restart."
        echo "Note that './run-kyrix --down' will clear the database. If you want to backup the database before restarting,"
        echo -e "please contact Kyrix maintainers on Gitter (https://gitter.im/kyrix-mit/kyrix).\n"
        echo "exiting..."
        exit
    fi
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
backend_start_time=$(date +%s)
while [ 1 ]; do
    if docker logs 2>&1 --since $start_time kyrix_kyrix_1 | grep -q "Backend server started"; then
        break;
    fi;
    spin "waiting for Kyrix backend to start..."
    cur_time=$(date +%s)
    if [ $((cur_time - backend_start_time)) -gt 180 ]; then
        echo -e "\nKyrix backend has taken more than 3 minutes to start, which is not normal."
        echo "Try run 'sudo docker logs kyrix_kyrix_1' in a separate terminal tab to inspect docker logs."
        echo "If the log looks like there is an error, you should clean up docker (sudo ./run-kyrix.sh --down) and then restart."
        echo "Note that './run-kyrix --down' will clear the database. If you want to backup the database before restarting,"
        echo -e "please contact Kyrix maintainers on Gitter (https://gitter.im/kyrix-mit/kyrix).\n"
        echo "exiting..."
        exit
    fi
done

# redirect to docker logs
echo -e "\nKyrix back-end started! Redirecting to Kyrix backend logs...\n"
sleep 1
docker logs --since $start_time kyrix_kyrix_1 -f
