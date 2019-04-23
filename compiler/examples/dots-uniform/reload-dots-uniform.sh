#!/bin/bash
# wrapped as a script for start-kyrix.sh

if [ "x$PGCONN" = "x" ]; then echo "$0: PGCONN must be set."; exit 1; fi
if [ "x$PSQL" ]; then PSQL=`which psql`; fi
if [ ! -x $PSQL ]; then echo "$0: $PSQL not found - consider setting PSQL to the psql(1) path."; exit 1; fi
SCALE=${SCALE:-1}  # times 1M records

$PSQL $PGCONN -t -c "drop table if exists dots_uniform cascade; create table dots_uniform(id int, w int, h int, citus_distribution_id int);"

for i in {1..100}; do
    echo `date +%s`": loading dots_uniform data #$i of 100..."
    $PSQL $PGCONN -q -t -c "insert into dots_uniform (id,w,h, citus_distribution_id) select id, (random()*1000000)::bigint, (random()*100000)::bigint, (random()*2147483648*2.0 - 2147483648)::int from generate_series(1,10000*$SCALE) id;"
done
