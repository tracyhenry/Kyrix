#!/bin/sh
# wrapped as a script for start-kyrix.sh

cd /kyrix/compiler/examples/template-api-examples
node USMap.js | egrep -i "error|connected" || true
