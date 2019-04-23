#!/bin/bash
# wrapped as a script for start-kyrix.sh

if [ "x$PGCONN" = "x" ]; then echo "$0: PGCONN must be set."; exit 1; fi
if [ "x$PSQL" ]; then PSQL=`which psql`; fi
if [ ! -x $PSQL ]; then echo "$0: $PSQL not found - consider setting PSQL to the psql(1) path."; exit 1; fi
SCALE=${SCALE:-1}  # times 1M records

echo "$0: PSQL = $PSQL"
echo "$0: PGCONN = $PGCONN"
cmd="drop table if exists dots_pushdown_uniform cascade; create table dots_pushdown_uniform(id int, w int, h int, citus_distribution_id int); select create_distributed_table('dots_pushdown_uniform', 'citus_distribution_id')"
echo "$cmd"
echo "$cmd" | $PSQL $PGCONN -q -t

# TODO: divide by number of workers...
for i in {1..10}; do
    echo `date +%s`": loading dots_pushdown_uniform data #$i of 10..."
    # careful to create unique IDs - use the shard id (right(<shard>,3))
    cmd="select run_command_on_shards('dots_pushdown_uniform', \$\$ insert into %1\$s (id,w,h) select id * $i*1000 + right('%1\$s',3)::int, (random()*1000000)::bigint, (random()*100000)::bigint from generate_series(1,10000*$SCALE) id;\$\$)"
    echo "$cmd"
    echo "$cmd" | $PSQL $PGCONN -q -t
done

# set citus_distribution_id
echo `date +%s`": creating dots_pushdown_uniform_shardvals..."
cmd="drop table if exists dots_pushdown_uniform_shardvals; create table dots_pushdown_uniform_shardvals as select logicalrelid::text||'_'||shardid as shard,shardminvalue from pg_dist_shard where logicalrelid::text='dots_pushdown_uniform'; select create_reference_table('dots_pushdown_uniform_shardvals')"
echo "$cmd"
echo "$cmd" | $PSQL $PGCONN -q -t
echo `date +%s`": creating dots_pushdown_uniform_shardvals_local..."
cmd="select run_command_on_placements('dots_pushdown_uniform_shardvals', \$\$ create table if not exists dots_pushdown_uniform_shardvals_local as select * from %s \$\$)"
echo "$cmd"
echo "$cmd" | $PSQL $PGCONN -q -t
echo `date +%s`": setting citus_distribution_id in parallel..."
cmd="select run_command_on_shards('dots_pushdown_uniform', \$\$ update %1\$s set citus_distribution_id = (select shardminvalue::int from dots_pushdown_uniform_shardvals_local where shard='%1\$s')\$\$)"
echo "$cmd"
echo "$cmd" | $PSQL $PGCONN -q -t
echo `date +%s`": reload-dots-pushdown-uniform done."



