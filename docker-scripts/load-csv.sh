#!/bin/bash

# check input csv file exists
CSV_FILE="$1"
shift
if [ ! -f $CSV_FILE ]; then
    echo "Input file $CSV_FILE Not found"
    exit
fi
if [ ! ${CSV_FILE: -4} == ".csv" ]; then
    echo "Not a csv file: $CSV_FILE"
    exit
fi

# default csv delimiter
CSV_DELIMITER=","

# default db name and table name
x="${CSV_FILE##*/}"
if [[ $x == $CSV_FILE ]]; then
    DB_NAME=${CSV_FILE:0:$((${#CSV_FILE} - 4))}
else
    x=${CSV_FILE:$((${#CSV_FILE} - ${#x}))}
    DB_NAME=${x:0:$((${#x} - 4))}
fi
DB_TABLE=$DB_NAME

while [[ $# -gt 0 ]]
do
    key="$1"
    case $key in
        --dbname)
            DB_NAME="$2"
            shift
            shift
            ;;
        --tablename)
            DB_TABLE="$2"
            shift
            shift
            ;;
        --delimiter)
            CSV_DELIMITER="$2"
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
echo 'DB_TABLE='$DB_TABLE
echo 'CSV_DELIMITER='$CSV_DELIMITER

# create table and drop table
docker exec -it kyrix_db_1 psql postgresql://postgres:kyrixftw@localhost/postgres -c "CREATE DATABASE $DB_NAME";
docker exec -it kyrix_db_1 psql postgresql://postgres:kyrixftw@localhost/$DB_NAME -c "DROP TABLE IF EXISTS $DB_TABLE";

# copy file to kyrix_db_1
docker cp $CSV_FILE kyrix_db_1:/$CSV_FILE

# run pgfutter to load csv into postgres table
docker exec -it kyrix_db_1 ./pgfutter --dbname $DB_NAME --table $DB_TABLE --schema public --user postgres --pass kyrixftw csv -d $CSV_DELIMITER $CSV_FILE
