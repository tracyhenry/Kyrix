#!/bin/sh
# wrapped as a script for start-kyrix.sh
# must be run in the same directory as nba_db_psql.sql

# download NBA example data
if [ ! -f nba_db_psql.sql ]; then
    wget -q -O nba_db_psql.sql 'https://www.dropbox.com/s/baqb01thxvfthk5/nba_db_psql.sql?dl=1' > /dev/null
fi

perl -ne 'print if (s@^CREATE TABLE ([^ ]+).+@DROP TABLE IF EXISTS \1 CASCADE;@);' < nba_db_psql.sql | { cat; cat nba_db_psql.sql; } | egrep -v '^SET idle_in_transaction_session_timeout'

