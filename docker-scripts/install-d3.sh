#!/bin/bash
#
# run inside docker, on each database
# note: can't be added to postgres initialization because we haven't created the kyrix databases yet;
# also, install_modules/add_modules can't connect via unix sockets, which is the only option pg
# allows during init
#
if [ `whoami` != "postgres" ]; then
    echo "$0: must run as postgres, not "`whoami`
    exit 1
fi

cd /var/lib/postgresql

psql $1 -c "create extension if not exists plv8"
./plv8-modules/bin/install_modules -d $1
echo "adding d3 to plv8-modules..."
./plv8-modules/bin/add_module_simple -d $1 --simple -n d3 --path /var/lib/postgresql/node_modules/d3/dist/d3.js
echo "testing require('d3')..."
psql $1 -c "SET plv8.start_proc = 'commonjs.plv8_startup'; DO \$\$ d3=require('d3');var d3_working=(d3.min([2,1,3])==1); plv8.elog( d3_working?NOTICE:error, d3_working ? 'd3 working!' : 'd3 not working'); \$\$ LANGUAGE plv8;"

