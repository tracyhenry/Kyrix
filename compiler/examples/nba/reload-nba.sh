#!/bin/sh
# wrapped as a script for start-kyrix.sh
# must be run in the same directory as nba_db_psql.sql

if [ "x$PGCONN" = "x" ]; then echo "$0: PGCONN must be set."; exit 1; fi
if [ "x$PSQL" ]; then PSQL=`which psql`; fi
if [ ! -x $PSQL ]; then echo "$0: $PSQL not found - consider setting PSQL to the psql(1) path."; exit 1; fi

# download NBA example data
if [ ! -f nba_db_psql.sql ]; then
    echo "downloading NBA dataset..."
    wget -q -O nba_db_psql.sql 'https://www.dropbox.com/s/ttnnzmaqyaks565/nba_db_psql_v3.sql?dl=1' > /dev/null
fi

echo "dropping NBA source tables..."
cat nba_db_psql.sql | perl -ne 'print if (s@^CREATE TABLE ([^ ]+).+@DROP TABLE IF EXISTS \1 CASCADE;@);' | $PSQL $PGCONN | egrep -i 'error'

echo "loading NBA dataset..."
cat nba_db_psql.sql | egrep -v '^SET idle_in_transaction_session_timeout' | $PSQL $PGCONN | egrep -i 'error'
# || true
