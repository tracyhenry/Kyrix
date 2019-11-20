gsutil -m cp -r gs://autodd_data .

su - postgres
psql kyrix -c " CREATE UNLOGGED TABLE liquor_sales(store text, date date, item text, gallons real, price real, bottles int, total real, day int, hash_key int);   select create_distributed_table('liquor_sales', 'hash_key'); "
find /autodd_data/iowa_liquor_sales/ -type f | time xargs -n1 -P16 sh -c "psql kyrix -c \"\\COPY liquor_sales FROM '\$0' CSV HEADER \""
psql kyrix -c " DELETE FROM liquor_sales WHERE price is null; "
