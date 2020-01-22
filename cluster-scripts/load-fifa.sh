kubectl exec $MASTER -- su - postgres -c "psql $KYRIX_DB -c \"CREATE TABLE fifa19(name text, defending int, general int, mental int, passing int, mobility int, power int, rating int, shooting int, flag text, age int, nationality text, photo text, club_logo text, club text, wage int, position text, id int, agegroup text); \" "
kubectl exec $MASTER -- wget https://www.dropbox.com/s/4cdabhctkybw8tf/fifa19.csv -O fifa19.csv
kubectl exec $MASTER -- su - postgres -c "psql $KYRIX_DB -c \"COPY fifa19 FROM '/fifa19.csv' CSV HEADER; \""
kubectl exec $MASTER -- su - postgres -c "psql $KYRIX_DB -c \"alter table fifa19 add column hash_key int; update fifa19 set hash_key = random() * 10000000; \""
