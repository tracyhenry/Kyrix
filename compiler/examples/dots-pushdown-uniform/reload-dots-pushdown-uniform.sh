#!/bin/bash
# wrapped as a script for start-kyrix.sh

if [ "x$PGCONN" = "x" ]; then echo "$0: PGCONN must be set."; exit 1; fi
if [ "x$PSQL" ]; then PSQL=`which psql`; fi
if [ ! -x $PSQL ]; then echo "$0: $PSQL not found - consider setting PSQL to the psql(1) path."; exit 1; fi
SCALE=${SCALE:-1}  # times 1M records

NUM_CORES=`nproc`
SHARD_COUNT=$(python -c "print(max(32, $NUM_WORKERS * $NUM_CORES))")
RECS=$(python -c "print(1000000*$SCALE)")

echo "$0: PSQL = $PSQL, PGCONN = $PGCONN - dropping and recreating dots_pushdown_uniform table with $RECS across $SHARD_COUNT shards (NUM_CORES=$NUM_CORES, NUM_WORKERS=$NUM_WORKERS)"
cmd="drop table if exists dots_pushdown_uniform cascade; create table dots_pushdown_uniform(id bigint, w int, h int, citus_distribution_id int); set citus.shard_count=$SHARD_COUNT; select create_distributed_table('dots_pushdown_uniform', 'citus_distribution_id')"
echo "$cmd" | tee | $PSQL $PGCONN -q -t

# TODO: divide by number of workers...
for i in {1..10}; do
    echo `date +%s`": loading dots_pushdown_uniform data #$i of 10..."
    # careful to create unique IDs - use the shard id (right(<shard>,3))
    cmd="select run_command_on_shards('dots_pushdown_uniform', \$\$ insert into %1\$s (id,w,h) select (id::bigint) * $i*1000 + right('%1\$s',3)::bigint, (random()*1000000)::int, (random()*100000)::int from generate_series(1,(1000000*$SCALE/$SHARD_COUNT)::int) id;\$\$)"
    echo "$cmd" | tee | $PSQL $PGCONN -q -t
done

# set citus_distribution_id
echo `date +%s`": creating dots_pushdown_uniform_shardvals..."
cmd="drop table if exists dots_pushdown_uniform_shardvals; create table dots_pushdown_uniform_shardvals as select shard, min(i) val from (select 'dots_pushdown_uniform_'||get_shard_id_for_distribution_column('dots_pushdown_uniform', i) as shard, i from generate_series(1,10000) i)t group by 1 order by 1; select create_reference_table('dots_pushdown_uniform_shardvals');"
echo "$cmd" | tee | $PSQL $PGCONN -q -t
echo `date +%s`": creating dots_pushdown_uniform_shardvals_local..."
cmd="select run_command_on_placements('dots_pushdown_uniform_shardvals', \$\$ drop table if exists dots_pushdown_uniform_shardvals_local; \$\$)"
echo "$cmd" | tee | $PSQL $PGCONN -q -t
# multiple shards on the same server = multiple attempts to create this table
cmd="select run_command_on_placements('dots_pushdown_uniform_shardvals', \$\$ create table if not exists dots_pushdown_uniform_shardvals_local as select * from %s \$\$)"
echo "$cmd" | tee | $PSQL $PGCONN -q -t
echo `date +%s`": setting citus_distribution_id in parallel..."
cmd="select run_command_on_shards('dots_pushdown_uniform', \$\$ update %1\$s set citus_distribution_id = (select val from dots_pushdown_uniform_shardvals_local where shard='%1\$s')\$\$)"
echo "$cmd" | tee | $PSQL $PGCONN -q -t
echo `date +%s`": reload-dots-pushdown-uniform done."


