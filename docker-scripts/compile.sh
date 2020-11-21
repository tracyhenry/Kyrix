#!/bin/bash

# copy everything
docker cp . kyrix_kyrix_1:/kyrix/compiler/examples/user_app/

# run specs
docker exec -w /kyrix/compiler/examples/user_app -it kyrix_kyrix_1 sh -c "node $1 $2"
