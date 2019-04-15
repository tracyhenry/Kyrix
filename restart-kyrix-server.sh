#!/bin/sh

source setup-kyrix-vars.env > /dev/null

SRCDATA_DB=${SRCDATA_DB:-nba}
SRCDATA_DB_TEST_TABLE=${SRCDATA_DB_TEST_TABLE:-plays}  # source table (one of...) checked to avoid duplicate loads
SRCDATA_DB_TEST_TABLE_MIN_RECS=${SRCDATA_DB_TEST_TABLE_MIN_RECS:-500000}  # rarely needs changing: min records to find in test table
SRCDATA_DB_LOAD_CMD=${SRCDATA_DB_LOAD_CMD:-/kyrix/compiler/examples/nba/reload-nba.sh}
KYRIX_DB_INDEX_CMD=${KYRIX_DB_INDEX_CMD:-/kyrix/compiler/examples/nba/reindex-nba.sh}
KYRIX_DB_INDEX_FORCE=${KYRIX_DB_INDEX_FORCE:-0}

#example: SRCDATA_DB=dots SRCDATA_DB_TEST_TABLE=dots SRCDATA_DB_LOAD_CMD=/kyrix/compiler/examples/dots/reload-dots.sh KYRIX_DB_INDEX_CMD=/kyrix/compiler/examples/dots/reindex-dots.sh KYRIX_DB_INDEX_FORCE=1 ./restart-kyrix-server

# note: DBTYPE=psql is safe, but won't distribute the data across the Citus cluster, i.e. it'll use local tables on the master Citus node only.
kubectl exec -it $KYRIX -- sh -c "cd /kyrix/back-end; SRCDATA_DB=$SRCDATA_DB SRCDATA_DB_TEST_TABLE=$SRCDATA_DB_TEST_TABLE SRCDATA_DB_LOAD_CMD=$SRCDATA_DB_LOAD_CMD KYRIX_DB_INDEX_CMD=$KYRIX_DB_INDEX_CMD KYRIX_DB_INDEX_FORCE=$KYRIX_DB_INDEX_FORCE DBTYPE=citus PGHOST=master POSTGRES_PASSWORD=kyrixftw USERNAME=kyrix USER_PASSWORD=kyrix_password /wait-for-postgres master:5432 -t 60 -- /start-kyrix.sh" &
