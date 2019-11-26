# SELECT body, created_utc, score, length(body) as body_len, ('http://reddit.com/r/'+subreddit+'/comments/'+REGEXP_REPLACE(link_id, 't[0-9]_','')+'/c/'+id) as link, cast((rand() * 10000000) as INTEGER) as hash_key from [fh-bigquery:reddit_comments.2015_02] where length(body) > 0 and not(body contains '\\') and not(body contains '^');
# SELECT body, created_utc, score, length(body) as body_len, ('http://reddit.com/r/'+subreddit+'/comments/'+REGEXP_REPLACE(link_id, 't[0-9]_','')+'/c/'+id) as link, cast((rand() * 10000000) as INTEGER) as hash_key from [fh-bigquery:reddit_comments.2015_02] where length(body) > 0 and not(body contains '\\') and not(body contains '�') and not(body contains '0x') and not(body contains '0X') and not(subreddit contains '0x') and not(subreddit contains '0X') and not(link_id contains '0x') and not(link_id contains '0X') and not(id contains '0x') and not(id contains '0X');
# SELECT substr(body, 1, 100) as body, created_utc, score, length(body) as body_len, subreddit, REGEXP_REPLACE(link_id, 't[0-9]_','') as link_id, id as comment_id, cast((rand() * 10000000) as INTEGER) as hash_key from [fh-bigquery:reddit_comments.2015_02] where length(body) > 0 and not(body contains '\\') and not(body contains '�') and not(body contains '0x') and not(body contains '0X') and not(subreddit contains '0x') and not(subreddit contains '0X') and not(link_id contains '0x') and not(link_id contains '0X') and not(id contains '0x') and not(id contains '0X');
gsutil -m cp -r gs://autodd_reddit_comments .

# find /autodd_reddit_comments/ -type f | time xargs -n1 -P10 sed -i $'s/[^[:print:]\t]//g'
su - postgres
psql kyrix -c " CREATE UNLOGGED TABLE comments(body text, created_utc int, score int, body_len int, subreddit text, link_id text, comment_id text, hash_key int);   select create_distributed_table('comments', 'hash_key'); "
find /autodd_reddit_comments/ -type f | time xargs -n1 -P8 sh -c "psql kyrix -c \"\\COPY comments FROM '\$0' CSV HEADER \""



find /home/wenbo/autodd_reddit_comments/ -type f | time xargs -n1 -P10 sh -c "psql postgres://kyrix:kyrix_password@35.221.37.125/kyrix -c \"\\COPY comments FROM '\$0' CSV HEADER \""