#!/bin/bash

source setup-kyrix-vars.env > /dev/null
source ../docker-scripts/spinner.sh

DATA=${DATA:-nba}
KYRIX_DB_RELOAD_FORCE=${KYRIX_DB_RELOAD_FORCE:-0}
KYRIX_DB_INDEX_FORCE=${KYRIX_DB_INDEX_FORCE:-0}
if (( $KYRIX_DB_RELOAD_FORCE != 0 )); then KYRIX_DB_INDEX_FORCE=1; fi

SRCDATA_DB_TEST_TABLE_MIN_RECS=500000  # rarely needs changing: min records to find in test table

SCALE=${SCALE:-1}

if [ "x$DATA" = "xnba" ]; then
    echo "using 'nba' dataset..."
    SRCDATA_PROJECT_NAME=nba
    SRCDATA_DB=nba
    SRCDATA_DB_TEST_TABLE=plays
    SRCDATA_DB_LOAD_CMD=/kyrix/compiler/examples/nba/reload-nba.sh
    KYRIX_DB_INDEX_CMD=/kyrix/compiler/examples/nba/reindex-nba.sh
elif [ "x$DATA" = "xdots-uniform" ]; then
    echo "using 'dots-uniform' dataset..."
    SRCDATA_PROJECT_NAME=dots_uniform
    SRCDATA_DB=dots_uniform
    SRCDATA_DB_TEST_TABLE=dots_uniform
    SRCDATA_DB_LOAD_CMD=/kyrix/compiler/examples/dots-uniform/reload-dots-uniform.sh
    KYRIX_DB_INDEX_CMD=/kyrix/compiler/examples/dots-uniform/reindex-dots-uniform.sh
elif [ "x$DATA" = "xdots-skewed-80-20" ]; then
    echo "using 'dots-skewed-80-20' dataset..."
    SRCDATA_PROJECT_NAME=dots_skewed_80_20
    SRCDATA_DB=dots_skewed_80_20
    SRCDATA_DB_TEST_TABLE=dots_skewed_80_20
    SRCDATA_DB_LOAD_CMD=/kyrix/compiler/examples/dots-skewed-80-20/reload-dots-skewed-80-20.sh
    KYRIX_DB_INDEX_CMD=/kyrix/compiler/examples/dots-skewed-80-20/reindex-dots-skewed-80-20.sh
elif [ "x$DATA" = "xdots-pushdown-uniform" ]; then
    echo "using 'dots-pushdown-uniform' dataset..."
    SRCDATA_PROJECT_NAME=dots_pushdown_uniform
    SRCDATA_DB=kyrix
    SRCDATA_DB_TEST_TABLE=dots_pushdown_uniform
    SRCDATA_DB_LOAD_CMD=/kyrix/compiler/examples/dots-pushdown-uniform/reload-dots-pushdown-uniform.sh
    KYRIX_DB_INDEX_CMD=/kyrix/compiler/examples/dots-pushdown-uniform/reindex-dots-pushdown-uniform.sh
elif [ "x$SRCDATA_DB" = "x" ]; then
    echo "unknown DATA set - please provide SRCDATA_DB, SRCDATA_DB_TEST_TABLE, SRCDATA_DB_TEST_TABLE_MIN_RECS, SRCDATA_DB_LOAD_CMD and KYRIX_DB_INDEX_CMD"
    exit 1
fi

# note: DBTYPE=psql is safe, but won't distribute the data across the Citus cluster, i.e. it'll use local tables on the master Citus node only.
CMD="cd /kyrix/back-end; SCALE=$SCALE NUM_WORKERS=$NUM_WORKERS SRCDATA_PROJECT_NAME=$SRCDATA_PROJECT_NAME SRCDATA_DB=$SRCDATA_DB SRCDATA_DB_TEST_TABLE=$SRCDATA_DB_TEST_TABLE SRCDATA_DB_LOAD_CMD=$SRCDATA_DB_LOAD_CMD KYRIX_DB_INDEX_CMD=$KYRIX_DB_INDEX_CMD KYRIX_DB_INDEX_FORCE=$KYRIX_DB_INDEX_FORCE KYRIX_DB_RELOAD_FORCE=$KYRIX_DB_RELOAD_FORCE DBTYPE=citus PGHOST=master POSTGRES_PASSWORD=kyrixftw USERNAME=kyrix USER_PASSWORD=kyrix_password /wait-for-postgres master:5432 -t 60 -- /start-kyrix.sh"
echo $CMD
kubectl exec -it $KYRIX -- sh -c "$CMD" &

# wait for external IP then export vars
while [ 1 ]; do ip=`kubectl get services -o wide | grep kyrixserver | awk '{print $4}'`; if [ $ip != '<pending>' ]; then break; fi; spin "waiting for external IP"; done
source setup-kyrix-vars.env > /dev/null

while [ 1 ]; do started=`kubectl exec -it $KYRIX -- sh -c "cat /kyrix-started | tr -d '\n' "`; if [ "x$started" == 'xyes' ]; then break; fi; spin "waiting for kyrix to start"; done

echo "Kyrix running; run 'source cluster-scripts/setup-kyrix-vars.env' for convenience scripts/functions or visit http://$KYRIX_IP:8000/"

exit 0
