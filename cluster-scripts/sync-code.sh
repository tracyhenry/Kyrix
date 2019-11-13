#!/bin/bash

# delete the folders first
kubectl exec -it $KYRIX -- bash -c "rm -r /kyrix/compiler/*"
kubectl exec -it $KYRIX -- bash -c "rm -r /kyrix/back-end/*"

# copy everything
kubectl cp ../compiler/ $KYRIX:/kyrix/
kubectl cp ../back-end/ $KYRIX:/kyrix/
