#!/bin/bash
# TODO: hardcoded for postgres 11

source setup-citus-vars.env

PGDIR=/var/lib/postgresql
PGDATA=$PGDIR/data
PGCONF=$PGDATA/postgresql.conf

echo "enabling postgres query logs"
kubectl exec -it $MASTER -- sh -c "sed -i \"s@#log_executor_stats @log_executor_stats = @g\" $PGCONF"
kubectl exec -it $MASTER -- sh -c "sed -i \"s@log_executor_stats .*@log_executor_stats = on@g\" $PGCONF"

kubectl exec -it $MASTER -- sh -c "sed -i \"s@#log_statement @log_statement = @g\" $PGCONF"
kubectl exec -it $MASTER -- sh -c "sed -i \"s@log_statement .*@log_statement = 'all'@g\" $PGCONF"

kubectl exec -it $MASTER -- sh -c "sed -i \"s@#log_min_error_statement @log_min_error_statement @g\" $PGCONF"
kubectl exec -it $MASTER -- sh -c "sed -i \"s@log_min_error_statement .*@log_min_error_statement = debug1@g\" $PGCONF"

kubectl exec -it $MASTER -- sh -c "sed -i \"s@#log_destination @log_destination @g\" $PGCONF"
kubectl exec -it $MASTER -- sh -c "sed -i \"s@log_destination .*@log_destination = 'stderr'@g\" $PGCONF"

kubectl exec -it $MASTER -- sh -c "grep log_destination $PGCONF"

echo "signalling postgres to reload config"
kubectl exec -it $MASTER -- su - postgres -c "/usr/lib/postgresql/11/bin/pg_ctl -D $PGDATA reload"

# wildcards not working, so use egrep
CURRENT_LOGFILE=`kubectl exec -it $MASTER -- sh -c "/bin/ls -1t $PGDATA/log/postgres*log|head -1|xargs echo -n"`
echo "tailing the log: $CURRENT_LOGFILE"
kubectl exec -it $MASTER -- sh -c "tail -f $CURRENT_LOGFILE"




