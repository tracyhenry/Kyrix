#SELECT body, created_utc, score, length(body) as body_len, ('http://reddit.com/r/'+subreddit+'/comments/'+REGEXP_REPLACE(link_id, 't[0-9]_','')+'/c/'+id) as link from [fh-bigquery:reddit_comments.2015_02];
gsutil -m cp -r gs://autodd_reddit_comments .

su - postgres
psql kyrix -c " CREATE UNLOGGED TABLE comments(body text, created_utc int, score int, body_len int, link text, hash_key int);   select create_distributed_table('comments', 'hash_key'); "
find /autodd_reddit_comments/ -type f | time xargs -n1 -P10 sh -c "psql kyrix -c \"\\COPY comments FROM '\$0' CSV HEADER \""
psql kyrix -c " DELETE FROM trips WHERE body_len < 2;  "
