#!/bin/bash
# wrapped as a script for start-kyrix.sh

if [ "x$PGCONN" = "x" ]; then echo "$0: PGCONN must be set."; exit 1; fi
if [ "x$PSQL" ]; then PSQL=`which psql`; fi
if [ ! -x $PSQL ]; then echo "$0: $PSQL not found - consider setting PSQL to the psql(1) path."; exit 1; fi
DISTRIB=${DISTRIB:-UNIFORM}
SCALE=${SCALE:-1}  # times 1M records

$PSQL $PGCONN -t -c "drop table if exists dots cascade; create table dots(id int, w int, h int);"
if [ "x$DISTRIB" = "xUNIFORM" ]; then
    echo "DISTRIB=UNIFORM"
    for i in {1..100}; do
        echo `date +%s`": loading dots data #$i of 100 (uniform)..."
        $PSQL $PGCONN -t -c "insert into dots (id,w,h) select id, (random()*1000000)::bigint, (random()*100000)::bigint from generate_series(1,10000*$SCALE) id;"
    done
elif [ "x$DISTRIB" = "xSKEWED" ]; then
    echo "DISTRIB=SKEWED"
    for i in {1..80}; do
        echo `date +%s`": loading dots data #$i of 100 (skewed to small area)..."
        $PSQL $PGCONN -t -c "insert into dots (id,w,h) select id, (random()*400000)::bigint, (random()*50000)::bigint from generate_series(1,10000*$SCALE) id;"
    done
    for i in {81..100}; do
        echo `date +%s`": loading dots data #$i of 100 (uniform)..."
        $PSQL $PGCONN -t -c "insert into dots (id,w,h) select id, (random()*1000000)::bigint, (random()*100000)::bigint from generate_series(1,10000*$SCALE) id;"
    done
else
    echo "unknown DISTRIB=$DISTRIB ?!?!?!"
    exit 1
fi
exit 0


# slow boat: generate the data then load it...

DOTSFILE=dotsfile.txt
if [ ! -f $DOTSFILE ] || [ "x${FORCE:-0}" != "x0" ]; then
    echo "$DOTSFILE doesn't exist; recreating..."
    apk add --update alpine-sdk
    g++ -O2 ../compiler/examples/dots/datagen/gen_fast.cpp -o gen_fast
    ./gen_fast 1000000 | tail +2 > $DOTSFILE
    wc -l $DOTSFILE
fi

# dots database is created by start-kyrix.sh
$PSQL $PGCONN -q -t -c "drop table if exists dots cascade"
cat $DOTSFILE | $PSQL $PGCONN -q -t -c "create table dots (id int, w int, h int); COPY dots (id,w,h) FROM STDIN ; select 'records loaded', count(*) from dots;"


# experiment where dotsfile is created on master - tricky because kyrix server needs kubectl to login to master...

# DOTSFILE=dotsfile.txt
# DOTSFILE_EXISTS=`kubectl exec -i $MASTER -- su - postgres -c "if [ -f $DOTSFILE ]; then echo yes; else echo no; fi" `
# if [ "x$DOTSFILE_EXISTS" = "xno" ] || [ "x${FORCE:-0}" != "x0" ]; then
#     echo "$DOTSFILE doesn't exist on $MASTER; recreating..."
#     kubectl exec -i $MASTER -- apt-get install -qq -y build-essential
#     cat ./compiler/examples/dots/datagen/gen_fast.cpp | kubectl exec -i $MASTER -- su - postgres -c "cat > gen_fast.cpp; g++ -O2 gen_fast.cpp -o gen_fast; ./gen_fast 1000000 | tail +2 > $DOTSFILE; wc -l $DOTSFILE"
# 
#     # FUTURE: parallel load - create db on each node then figure out how to get kyrix to index in parallel
#     #kubectl exec -i $MASTER -- su - postgres -c "cat gen_fast" > /tmp/gen_fast_to_distribute
#     #echo "distributing to workers..."
#     #for w in $WORKERS; do
#     #   cat /tmp/gen_fast_to_distribute | kubectl exec -i $w -- su - postgres -c "cat > gen_fast; chmod 755 gen_fast; ./gen_fast 1000000 > $DOTSFILE; echo \"$w: \`wc -l $DOTSFILE\`\"" &
#     #done
#     #wait
# fi
# DOTSFILE_DIR=`kubectl exec -i $MASTER -- su - postgres -c "pwd | tr -d '\n'"`
# 
# kubectl exec $MASTER -- su - postgres -c "psql -q -t -c \"create database dots\"; psql dots -q -t -c \"drop table if exists dots cascade; create table dots (id int, w int, h int); COPY dots (id,w,h) FROM '$DOTSFILE_DIR/$DOTSFILE' ; select 'records loaded', count(*) from dots;\" "

