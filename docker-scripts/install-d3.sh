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

psql $1 -q -c "create extension if not exists plv8"
./plv8-modules/bin/install_modules -d $1
echo "adding d3 to plv8-modules in database $1..."
./plv8-modules/bin/add_module_simple -d $1 --simple -n d3 --path /var/lib/postgresql/node_modules/d3/dist/d3.js
echo "testing require('d3')..."
echo "SET plv8.start_proc = 'commonjs.plv8_startup'; DO \$x\$ d3=require('d3');var d3_working=(d3.min([2,1,3])==1); if(d3_working) { plv8.elog(NOTICE, 'd3 working.') } else { plv8.elog(ERROR,'d3 not working'); }; \$x\$ LANGUAGE plv8; create function plv8_test_func() returns int as \$x\$ d3=require('d3'); return 42; \$x\$ language plv8;" | psql $1
