#!/bin/bash

source setup-kyrix-vars.env > /dev/null

DATA=${DATA:-nba}
KYRIX_DB_INDEX_FORCE=${KYRIX_DB_INDEX_FORCE:-0}
SCALE=${SCALE:-1}
DISTRIB=${DISTRIB:-UNIFORM}

if [ "x$DATA" = "xnba" ]; then
    echo "using 'nba' dataset..."
    SRCDATA_DB=nba
    SRCDATA_DB_TEST_TABLE=plays
    SRCDATA_DB_TEST_TABLE_MIN_RECS=500000  # rarely needs changing: min records to find in test table
    SRCDATA_DB_LOAD_CMD=/kyrix/compiler/examples/nba/reload-nba.sh
    KYRIX_DB_INDEX_CMD=/kyrix/compiler/examples/nba/reindex-nba.sh
elif [ "x$DATA" = "xdots" ]; then
    echo "using 'dots' dataset..."
    SRCDATA_DB=dots
    SRCDATA_DB_TEST_TABLE=dots
    SRCDATA_DB_TEST_TABLE_MIN_RECS=500000
    SRCDATA_DB_LOAD_CMD=/kyrix/compiler/examples/dots/reload-dots.sh
    KYRIX_DB_INDEX_CMD=/kyrix/compiler/examples/dots/reindex-dots.sh

    #DISTRIB=UNIFORM PGCONN=postgresql://postgres:kyrixftw@master:5432/dots ../compiler/examples/dots/reload-dots.sh
    #DISTRIB=SKEWED PGCONN=postgresql://postgres:kyrixftw@master:5432/dots ../compiler/examples/dots/reload-dots.sh
else
    echo "using custom dataset - $SRCDATA_DB"
fi

# note: DBTYPE=psql is safe, but won't distribute the data across the Citus cluster, i.e. it'll use local tables on the master Citus node only.
kubectl exec -it $KYRIX -- sh -c "cd /kyrix/back-end; SCALE=$SCALE DISTRIB=$DISTRIB SRCDATA_DB=$SRCDATA_DB SRCDATA_DB_TEST_TABLE=$SRCDATA_DB_TEST_TABLE SRCDATA_DB_LOAD_CMD=$SRCDATA_DB_LOAD_CMD KYRIX_DB_INDEX_CMD=$KYRIX_DB_INDEX_CMD KYRIX_DB_INDEX_FORCE=$KYRIX_DB_INDEX_FORCE KYRIX_DB_RELOAD_FORCE=$KYRIX_DB_RELOAD_FORCE DBTYPE=citus PGHOST=master POSTGRES_PASSWORD=kyrixftw USERNAME=kyrix USER_PASSWORD=kyrix_password /wait-for-postgres master:5432 -t 60 -- /start-kyrix.sh" &
