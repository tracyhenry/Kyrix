#!/bin/sh
# wrapped as a script for start-kyrix.sh

#cd /kyrix/compiler/examples/template-api-examples
cd /kyrix/compiler/examples/USMap/
node USMap.js | egrep -i "error|connected" || true
