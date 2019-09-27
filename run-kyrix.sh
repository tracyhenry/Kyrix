#!/bin/bash

DB_PORT=5432
KYRIX_PORT=8000
START_APP=0

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
        *)
            echo "Wrong argument name $key"
            exit
            ;;
    esac
done

DB_PORT=$DB_PORT KYRIX_PORT=$KYRIX_PORT START_APP=$START_APP docker-compose up
