#!/bin/bash

# make a user_app directory
docker exec -it kyrix_kyrix_1 sh -c "mkdir -p /kyrix/compiler/examples/user_app/"

# copy spec into docker
for entry in "."/*
do
    docker cp $entry kyrix_kyrix_1:/kyrix/compiler/examples/user_app/$entry
done

# run specs
docker exec -w /kyrix/compiler/examples/user_app -it kyrix_kyrix_1 sh -c "node $1 $2"
