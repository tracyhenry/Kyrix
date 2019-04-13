\timing on

SET client_min_messages TO WARNING;

CREATE OR REPLACE FUNCTION citus_raise (msg text) returns boolean as $$
BEGIN
       RAISE WARNING '%', msg;
       return true;
END;
$$ language plpgsql;

DROP TABLE IF EXISTS ltowns CASCADE;
CREATE TABLE ltowns (
  id SERIAL,
  code VARCHAR(10),
  article TEXT,
  name TEXT, -- not unique
  department VARCHAR(4)
);

select citus_raise('inserting records into ltowns (local table)...');
insert into ltowns (
    code, article, name, department
) select
    left(md5(i::text), 10),
    md5(random()::text),
    md5(random()::text),
    left(md5(random()::text), 4)
from generate_series(1, 250000) s(i);   -- change to 2.5M for scale tests

-- citus table: dtowns -- partitioned table
DROP TABLE IF EXISTS dtowns CASCADE;
select citus_raise('copying ltowns to dtowns...');
CREATE TABLE dtowns as select * from ltowns;
select citus_raise('distributing dtowns across the cluster as a distributed/sharded table...');
select create_distributed_table('dtowns', 'id');

-- citus table: rtowns -- reference table (replicated on all nodes)
DROP TABLE IF EXISTS rtowns CASCADE;
select citus_raise('copying ltowns to rtowns...');
CREATE TABLE rtowns as select * from ltowns;
select citus_raise('distributing dtowns across the cluster as a reference/replicated table...');
select create_reference_table('rtowns');
select citus_raise('done creating citus test tables.');

-- test citus performance: first two queries should be slow, last should be 3-5x faster
-- (this has been automated with EXPLAIN queries in redeploy-citus)
-- select min(id::text||code||article||name||department) from ltowns;
-- select min(id::text||code||article||name||department) from rtowns;
-- select min(id::text||code||article||name||department) from dtowns;

-- postgis + citus test tables
--
-- DROP TABLE IF EXISTS dtest_postgis_addr;
-- CREATE TABLE dtest_postgis_addr (i SERIAL, s TEXT);
-- select create_distributed_table('dtest_postgis_addr', 'i');
-- insert into dtest_postgis_addr (i,s) values (1, '1 Devonshire Place PH301, Boston, MA 02109');
-- DROP TABLE IF EXISTS rtest_postgis_addr;
-- CREATE TABLE rtest_postgis_addr (i SERIAL, s TEXT);
-- select create_reference_table('rtest_postgis_addr');
-- insert into rtest_postgis_addr (i,s) values (1, '1 Devonshire Place PH301, Boston, MA 02109');


