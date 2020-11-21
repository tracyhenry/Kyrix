#!/bin/bash

usage="load-sql.sh: a script to load a SQL dump file into Kyrix's PostgreSQL container. Usage:

    ./docker-scripts/load-sql.sh SQL_DUMP_FILE [OPTIONS]  (must be run under root Kyrix folder)

where OPTIONS include:
    --dbname DBNAME: name of the database that you want to load the SQL dump file into.

--dbname defaults to the name of the SQL dump file (without the .sql suffix).
If the database does not exist, it will be created. "

SQL_FILE="$1"
shift

# output usage
if [ "x$SQL_FILE" = "x-h" ] || [ "x$SQL_FILE" = "x--help" ]; then
    echo "$usage"
    exit
fi

# check input sql file exists
if [ ! -f $SQL_FILE ]; then
    echo "Input file $SQL_FILE Not found"
    exit
fi
if [ ! ${SQL_FILE: -4} == ".sql" ]; then
    echo "Not a sql file: $SQL_FILE"
    exit
fi


# default db name
x="${SQL_FILE##*/}"
if [[ $x == $SQL_FILE ]]; then
    DB_NAME=${SQL_FILE:0:$((${#SQL_FILE} - 4))}
    # db name is the same name as the sql file
else
    x=${SQL_FILE:$((${#SQL_FILE} - ${#x}))}
    DB_NAME=${x:0:$((${#x} - 4))}
fi

FILE_NAME=$DB_NAME

while [[ $# -gt 0 ]]
do
    key="$1"
    case $key in
        --dbname)
            DB_NAME="$2"
            shift
            shift
            ;;
        *)
            echo "Wrong argument name $key"
            exit
            ;;
    esac
done

echo 'DB_NAME='$DB_NAME

# create table and drop table
docker exec -it kyrix_db_1 psql postgresql://postgres:kyrixftw@localhost/postgres -c "CREATE DATABASE ${DB_NAME}";

# copy file to kyrix_db_1
docker cp $SQL_FILE kyrix_db_1:/$FILE_NAME

# import sql file content into the selected database
docker exec -it kyrix_db_1 /bin/sh -c "psql postgresql://postgres:kyrixftw@localhost/${DB_NAME} < ${FILE_NAME}"
