#!/bin/bash

# usage:
# --nba: Run the NBA example upon start. You would need to wait the indexing for about a minute.
# --dbport PORT_NUMBER: Specify the host port number of the postgres container.
# --kyrixport PORT_NUMBER: Specify the host port number of the kyrix backend container.
# --postgis: Start the DB container with postgis. You need to either start from scratch or run with --build to let docker rebuild the images.
# --build: Rebuild the docker images before starting.

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
        *)
            echo "Wrong argument name $key"
            exit
            ;;
    esac
done

START_APP=$START_APP DB_PORT=$DB_PORT KYRIX_PORT=$KYRIX_PORT BUILD_STAGE=$BUILD_STAGE docker-compose up $REBUILD -d

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
CONF=/var/lib/postgresql/data/postgresql.conf
docker exec -t kyrix_db_1 su - postgres -c "psql -c \"create extension if not exists plv8\" " # shutup start_proc warning
docker exec -t kyrix_db_1 sed -i "s@^[#]\?maintenance_work_mem.*@maintenance_work_mem = '1GB'@" $CONF
docker exec -t kyrix_db_1 sed -i "s@^[#]\?max_worker_processes.*@max_worker_processes = '24'@" $CONF
docker exec -t kyrix_db_1 sed -i "s@^[#]\?max_parallel_workers.*@max_parallel_workers = '24'@" $CONF
docker exec -t kyrix_db_1 sed -i "s@^[#]\?max_parallel_workers_per_gather.*@max_parallel_workers_per_gather = '24'@" $CONF
docker exec -t kyrix_db_1 bash -c "echo \"plv8.start_proc = 'commonjs.plv8_startup'\" >> $CONF"
docker exec -t kyrix_db_1 su - postgres -c "/usr/lib/postgresql/11/bin/pg_ctl -D /var/lib/postgresql/data reload -s"

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
