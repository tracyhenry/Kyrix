#!/bin/bash

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

START_APP=$START_APP DB_PORT=$DB_PORT KYRIX_PORT=$KYRIX_PORT BUILD_STAGE=$BUILD_STAGE docker-compose up $REBUILD
