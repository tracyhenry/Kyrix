#!/bin/bash
# wrapped as a script for start-kyrix.sh

if [ "x$PGCONN" = "x" ]; then echo "$0: PGCONN must be set."; exit 1; fi
if [ "x$PSQL" ]; then PSQL=`which psql`; fi
if [ ! -x $PSQL ]; then echo "$0: $PSQL not found - consider setting PSQL to the psql(1) path."; exit 1; fi
SCALE=${SCALE:-1}  # times 1M records

$PSQL $PGCONN -t -c "drop table if exists dots_skewed_80_20 cascade; create table dots_skewed_80_20(id int, w int, h int, citus_distribution_id int);"

for i in {1..80}; do
    echo `date +%s`": loading dots_skewed_80_20 data #$i of 100 (skewed to small area)..."
    $PSQL $PGCONN -q -t -c "insert into dots_skewed_80_20 (id,w,h, citus_distribution_id) select id, (random()*400000)::bigint, (random()*50000)::bigint, (random()*2147483648*2.0 - 2147483648)::int from generate_series(1,10000*$SCALE) id;"
done

for i in {81..100}; do
    echo `date +%s`": loading dots_skewed_80_20 data #$i of 100 (uniform)..."
    $PSQL $PGCONN -q -t -c "insert into dots_skewed_80_20 (id,w,h, citus_distribution_id) select id, (random()*1000000)::bigint, (random()*100000)::bigint, (random()*2147483648*2.0 - 2147483648)::int from generate_series(1,10000*$SCALE) id;"
done
