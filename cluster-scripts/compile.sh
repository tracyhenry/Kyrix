#!/bin/bash

# delete the folder first
kubectl exec -it $KYRIX -- rm -rf /kyrix/compiler/examples/user_app

# copy everything
kubectl cp . $KYRIX:/kyrix/compiler/examples/user_app/

# run specs
kubectl exec -it $KYRIX -- bash -c "cd /kyrix/compiler/examples/user_app && node $1 $2"

