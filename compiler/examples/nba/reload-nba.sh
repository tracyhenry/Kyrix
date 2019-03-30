#!/bin/sh
# wrapped as a script for start-kyrix.sh
# must be run in the same directory as nba_db_psql.sql

cat nba_db_psql.sql | grep -v idle_in_transaction_session_timeout

