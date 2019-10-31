#!/bin/sh
# wrapped as a script for start-kyrix.sh
# must be run in the same directory as usmap_db_psql.sql

if [ "x$PGCONN" = "x" ]; then echo "$0: PGCONN must be set."; exit 1; fi
if [ "x$PSQL" ]; then PSQL=`which psql`; fi
if [ ! -x $PSQL ]; then echo "$0: $PSQL not found - consider setting PSQL to the psql(1) path."; exit 1; fi

# download USMap example data
if [ ! -f usmap_db_psql.sql ]; then
    echo "downloading USMap dataset..."
    wget -q -O usmap_db_psql.sql 'https://www.dropbox.com/s/obkbx8izp6cpysu/usmap_template_db_psql.sql?dl=0' > /dev/null
fi

echo "dropping USMap source tables..."
cat usmap_db_psql.sql | perl -ne 'print if (s@^CREATE TABLE ([^ ]+).+@DROP TABLE IF EXISTS \1 CASCADE;@);' | $PSQL $PGCONN | egrep -i 'error'

echo "loading USMap dataset..."
cat usmap_db_psql.sql | egrep -v '^SET idle_in_transaction_session_timeout' | $PSQL $PGCONN | egrep -i 'error'
# || true
