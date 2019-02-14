#!/bin/sh

# HACK!!!
# force the server to reindex the data, e.g. for development purposes
# the current method chosen is to hack the text of one of the SQL queries
# in a harmless way that the Kyrix server can't detect but which the
# underlying database will optimize-away.

sed -i "s@1=1@`date +%s`>0@" transforms.js

node nba.js
