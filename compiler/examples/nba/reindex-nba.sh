#!/bin/sh
# wrapped as a script for start-kyrix.sh

cd /kyrix/compiler/examples/nba
node nba.js | egrep -i "error|connected" || true
