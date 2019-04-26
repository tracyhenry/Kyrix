--
-- hardcoded example pipeline for the dots-pushdown-uniform dataset
--   (much of this will be generated at runtime by PsqlNativeBoxIndexer)
--
-- after loading dots-pushdown-uniform (it should error at the indexing phase)
--   run this SQL by hand with kyrix-psql < hardcoded_kyrix_index_pipeline.sql
--

CREATE OR REPLACE FUNCTION get_random_number(bigint, bigint) RETURNS bigint AS $$
DECLARE
    start_int ALIAS FOR $1;
    end_int ALIAS FOR $2;
BEGIN
    RETURN trunc(random() * (end_int-start_int) + start_int);
END;
$$ LANGUAGE 'plpgsql' STRICT;

CREATE OR REPLACE FUNCTION get_random_distrib_key() RETURNS int AS $$
    SELECT (trunc(random()*(2147483648::bigint-2147483649::bigint) + 2147483649::bigint))::int;
$$ LANGUAGE sql STRICT;

--
-- null transform, for testing incl performance
--
DROP TYPE kyrix_transform_null_type CASCADE;
select run_command_on_workers($CITUS$ DROP TYPE kyrix_transform_null_type $CITUS$);
CREATE TYPE kyrix_transform_null_type as (id bigint,x int,y int); 
select run_command_on_workers($CITUS$ CREATE TYPE kyrix_transform_null_type as (id bigint,x int,y int); $CITUS$);
DROP FUNCTION IF EXISTS kyrix_transform_null;
CREATE OR REPLACE FUNCTION kyrix_transform_null(id bigint,w int,h int) returns kyrix_transform_null_type AS $$
      return { id: id, x: Math.random()*1000, y: Math.random()*1000, };
$$ language plv8 stable;  -- master needs stable for citus to pushdown to workers
select run_command_on_workers('DROP FUNCTION IF EXISTS kyrix_transform_null;');
select run_command_on_workers(s) FROM (
  select replace(pg_catalog.pg_get_functiondef('kyrix_transform_null(bigint,int,int)'::regprocedure::oid)::text, 'STABLE', '') s
)t;  -- workers need volatile for pg11 to memoize

--
-- example transform, for testing incl performance
--
DROP TYPE kyrix_transform_example_type CASCADE;
select run_command_on_workers($CITUS$ DROP TYPE kyrix_transform_example_type; $CITUS$);
CREATE TYPE kyrix_transform_example_type as (id bigint,x int,y int); 
select run_command_on_workers($CITUS$ CREATE TYPE kyrix_transform_example_type as (id bigint,x int,y int); $CITUS$);

DROP FUNCTION IF EXISTS kyrix_transform_example;
CREATE OR REPLACE FUNCTION kyrix_transform_example(id bigint,w int,h int) returns kyrix_transform_example_type AS $$
      d3=require('d3');
      kyrix={width:1000000,height:1000000};
      //plv8.elog(INFO, "plv8 called on master: id="+id+"  w="+w+"  h="+h);
      return {
        id: id,
        x: d3.scaleLinear().domain([0, 100000]).range([0, kyrix.width])(w),
        y: d3.scaleLinear().domain([0, 100000]).range([0, kyrix.height])(h),
      };
$$ language plv8 stable;  -- master needs stable for citus to pushdown to workers
select run_command_on_workers('  DROP FUNCTION IF EXISTS kyrix_transform_example;');
select run_command_on_workers(s) FROM (
  select replace(pg_catalog.pg_get_functiondef('kyrix_transform_example(bigint,int,int)'::regprocedure::oid)::text, 'STABLE', '') s
)t;  -- workers need volatile for pg11 to memoize

     

CREATE TYPE kyrix_bbox_coords_type as (cx double precision, cy double precision, minx double precision, miny double precision, maxx double precision, maxy double precision);
select run_command_on_workers($CITUS$
  CREATE TYPE kyrix_bbox_coords_type as (cx double precision, cy double precision, minx double precision, miny double precision, maxx double precision, maxy double precision);
$CITUS$);

--
-- null bbox_coords function, for testing incl performance
--
DROP FUNCTION IF EXISTS kyrix_bbox_coords_null;
CREATE OR REPLACE FUNCTION kyrix_bbox_coords_null(x int,y int) returns kyrix_bbox_coords_type AS $$
  //plv8.elog(INFO,'kyrix_bbox_coords_null called on master');
  return { cx: x, cy: y, minx: x-0.5, miny: y-0.5, maxx: x+0.5, maxy: y+0.5, }
$$ language plv8 stable;  -- master needs stable for citus to pushdown to workers
select run_command_on_workers($CITUS$ DROP FUNCTION if exists kyrix_bbox_coords_null $CITUS$);
select run_command_on_workers(s) FROM (
  select replace(pg_catalog.pg_get_functiondef('kyrix_bbox_coords_null(int,int)'::regprocedure::oid)::text, 'STABLE', '') s
)t;  -- workers need volatile for pg11 to memoize

--
-- example bbox_coords function, for testing incl performance
--
DROP FUNCTION IF EXISTS kyrix_bbox_coords_example;
CREATE OR REPLACE FUNCTION kyrix_bbox_coords_example(x int,y int) returns kyrix_bbox_coords_type AS $$
  //plv8.elog(INFO,'kyrix_bbox_coords_example called on master');
  return { cx: x, cy: y,
    minx: x-0.5,
    miny: y-0.5,
    maxx: x+0.5,
    maxy: y+0.5,
  }
$$ language plv8 stable;  -- master needs stable for citus to pushdown to workers
select run_command_on_workers($CITUS$ DROP FUNCTION if exists kyrix_bbox_coords_example $CITUS$);
select run_command_on_workers(s) FROM (
  select replace(pg_catalog.pg_get_functiondef('kyrix_bbox_coords_example(int,int)'::regprocedure::oid)::text, 'STABLE', '') s
)t;  -- workers need volatile for pg11 to memoize

DROP TABLE IF EXISTS bbox_dots_pushdown_uniform_toplayer0 CASCADE;
CREATE UNLOGGED TABLE bbox_dots_pushdown_uniform_toplayer0(id bigint,x int,y int, citus_distribution_id int, cx double precision, cy double precision, minx double precision, miny double precision, maxx double precision, maxy double precision);
SELECT create_distributed_table('bbox_dots_pushdown_uniform_toplayer0', 'citus_distribution_id', colocate_with => 'dots_pushdown_uniform');

SET citus.task_executor_type = 'task-tracker';
DROP VIEW if exists bbox_dots_pushdown_uniform_pipeline_query;
CREATE VIEW bbox_dots_pushdown_uniform_pipeline_query AS
SELECT id, x, y, citus_distribution_id, (coords::kyrix_bbox_coords_type).cx, (coords::kyrix_bbox_coords_type).cy,
       (coords::kyrix_bbox_coords_type).minx, (coords::kyrix_bbox_coords_type).miny, (coords::kyrix_bbox_coords_type).maxx, (coords::kyrix_bbox_coords_type).maxy
  FROM (
    SELECT (v::kyrix_transform_example_type).id, (v::kyrix_transform_example_type).x, (v::kyrix_transform_example_type).y,
           citus_distribution_id, kyrix_bbox_coords_null( (v::kyrix_transform_example_type).x, (v::kyrix_transform_example_type).y ) coords
    FROM (
      SELECT kyrix_transform_example(id,w,h) v, citus_distribution_id
      FROM dots_pushdown_uniform
    ) sq1
  ) sq2
;

\timing on
\echo 'running 0.1% pipeline query from dots_pushdown_uniform...'
select sum(x+y) from (
SELECT id, x, y, citus_distribution_id, (coords::kyrix_bbox_coords_type).cx, (coords::kyrix_bbox_coords_type).cy,
       (coords::kyrix_bbox_coords_type).minx, (coords::kyrix_bbox_coords_type).miny, (coords::kyrix_bbox_coords_type).maxx, (coords::kyrix_bbox_coords_type).maxy
  FROM (
    SELECT (v::kyrix_transform_example_type).id, (v::kyrix_transform_example_type).x, (v::kyrix_transform_example_type).y,
           citus_distribution_id, kyrix_bbox_coords_null( (v::kyrix_transform_example_type).x, (v::kyrix_transform_example_type).y ) coords
    FROM (
      SELECT kyrix_transform_example(id,w,h) v, citus_distribution_id
      FROM dots_pushdown_uniform
      where w % 1000 < 1
    ) sq1
  ) sq2
)t;
;

\echo 'running 1% pipeline query from dots_pushdown_uniform...'
select sum(x+y) from (
SELECT id, x, y, citus_distribution_id, (coords::kyrix_bbox_coords_type).cx, (coords::kyrix_bbox_coords_type).cy,
       (coords::kyrix_bbox_coords_type).minx, (coords::kyrix_bbox_coords_type).miny, (coords::kyrix_bbox_coords_type).maxx, (coords::kyrix_bbox_coords_type).maxy
  FROM (
    SELECT (v::kyrix_transform_example_type).id, (v::kyrix_transform_example_type).x, (v::kyrix_transform_example_type).y,
           citus_distribution_id, kyrix_bbox_coords_null( (v::kyrix_transform_example_type).x, (v::kyrix_transform_example_type).y ) coords
    FROM (
      SELECT kyrix_transform_example(id,w,h) v, citus_distribution_id
      FROM dots_pushdown_uniform
      where w % 1000 < 10
    ) sq1
  ) sq2
)t;
;

\echo 'running 100% pipeline from dots_pushdown_uniform to bbox_dots_pushdown_uniform_toplayer0...'
EXPLAIN INSERT INTO bbox_dots_pushdown_uniform_toplayer0 (id,x,y,citus_distribution_id, cx, cy, minx, miny, maxx, maxy) SELECT * FROM bbox_dots_pushdown_uniform_pipeline_query;
INSERT INTO bbox_dots_pushdown_uniform_toplayer0 (id,x,y,citus_distribution_id, cx, cy, minx, miny, maxx, maxy) SELECT * FROM bbox_dots_pushdown_uniform_pipeline_query;

-- not sure why this isn't getting created...
\echo 'adding geom column...';
alter table bbox_dots_pushdown_uniform_toplayer0 add column geom box;

\echo 'setting geom column...';
update bbox_dots_pushdown_uniform_toplayer0 set geom = box( point(minx,miny), point(maxx, maxy) );

-- this is slow: 3+ mins
\echo 'CREATE INDEX on geom column...';
create index bbox_dots_pushdown_uniform_toplayer0_idx on bbox_dots_pushdown_uniform_toplayer0 using gist(geom);

SET citus.task_executor_type = 'real-time';
