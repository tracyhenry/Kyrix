gsutil -m cp -r gs://autodd_chicago_taxi .

su - postgres
psql kyrix -c " CREATE UNLOGGED TABLE trips(seconds real, total real, hash_key int);   select create_distributed_table('trips', 'hash_key'); "
find /autodd_chicago_taxi/ -type f | time xargs -n1 -P10 sh -c "psql kyrix -c \"\\COPY trips FROM '\$0' CSV HEADER \""
psql kyrix -c " DELETE FROM trips WHERE seconds > 3000 or total > 200;  "
psql kyrix -c " DELETE FROM trips WHERE seconds is null or total is null;  "
psql kyrix -c " DELETE FROM trips WHERE seconds <= 30 and total > 10;  "
