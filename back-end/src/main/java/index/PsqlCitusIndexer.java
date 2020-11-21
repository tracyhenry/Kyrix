package index;

import java.sql.Statement;
import java.util.Date;
import java.util.function.UnaryOperator;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Layer;
import project.Transform;

/** Created by wenbo on 4/25/20. */
public class PsqlCitusIndexer extends PsqlNativeBoxIndexer {

    private static PsqlNativeBoxIndexer instance = null;

    // singleton pattern to ensure only one instance existed
    protected PsqlCitusIndexer() {}

    // thread-safe instance getter
    public static synchronized PsqlNativeBoxIndexer getInstance() {

        if (instance == null) instance = new PsqlCitusIndexer();
        return instance;
    }

    void run_citus_dml_ddl(Statement stmt, String sql) throws Exception {
        System.out.println(sql + " -- also running on workers");
        System.out.println(sql.replaceAll("\n", " "));
        stmt.executeUpdate(sql);
        sql = "select run_command_on_workers($CITUS$ " + sql + " $CITUS$);";
        System.out.println(sql.replaceAll("\n", " "));
        stmt.executeQuery(sql);
    }

    void run_citus_dml_ddl2(Statement stmt, String masterSql, String workerSql) throws Exception {
        System.out.println(masterSql.replaceAll("\n", " "));
        stmt.executeUpdate(masterSql);
        String dworkerSql = "select run_command_on_workers($CITUS$ " + workerSql + " $CITUS$);";
        System.out.println(dworkerSql.replaceAll("\n", " "));
        stmt.executeQuery(dworkerSql);
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        Layer l = c.getLayers().get(layerId);
        Transform trans = l.getTransform();

        // step 0: create tables for storing bboxes and tiles
        String bboxTableName =
                "bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;

        // drop table if exists
        Statement dropCreateStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String sql = "drop table if exists " + bboxTableName + ";";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);

        // create the bbox table
        // yes, citus supports unlogged tables!
        // http://docs.citusdata.com/en/v8.1/performance/performance_tuning.html#postgresql-tuning
        sql = "CREATE UNLOGGED TABLE " + bboxTableName + " (";
        for (int i = 0; i < trans.getColumnNames().size(); i++)
            sql += trans.getColumnNames().get(i) + " text, ";
        sql += "citus_distribution_id int, ";
        sql +=
                "cx double precision, cy double precision, minx double precision, miny double precision, maxx double precision, maxy double precision, geom box)";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);
        dropCreateStmt.close();

        // if this is an empty layer, return
        if (trans.getDb().equals("")) return;

        System.out.println(
                "Transform database marked 'src_db_same_as_kyrix' - trying to pushdown...");
        Statement pushdownIndexStmt = DbConnector.getStmtByDbName(Config.databaseName);

        String transformFuncName = bboxTableName + "_transform_func";
        String bboxFuncName = bboxTableName + "_bbox_func";
        UnaryOperator<String> tsql =
                (sqlstr) -> {
                    return (sqlstr.replaceAll("transfunc", transformFuncName)
                            .replaceAll("bboxfunc", bboxFuncName)
                            .replaceAll("bboxtbl", bboxTableName)
                            .replaceAll("dbsource", trans.getDbsource()));
                };

        // register transform JS function with Postgres/Citus
        run_citus_dml_ddl(pushdownIndexStmt, tsql.apply("DROP FUNCTION IF EXISTS bboxfunc"));
        run_citus_dml_ddl(pushdownIndexStmt, tsql.apply("DROP FUNCTION IF EXISTS transfunc"));

        // bbox func
        sql =
                tsql.apply(
                        "CREATE OR REPLACE FUNCTION bboxfunc(v json) returns double precision[]"
                                + " AS $$ return [v.x, v.y, v.x-0.5, v.y-0.5, (+v.x)+0.5, (+v.y)+0.5]"
                                + "$$ LANGUAGE plv8");
        // master needs 'stable' for citus to pushdown to workers
        // workers need 'volatile' for pg11 to memoize and not call the function repeatedly per
        // row
        run_citus_dml_ddl2(
                pushdownIndexStmt, sql + " STABLE", sql); // append is safer than replace...

        // transform func
        sql =
                tsql.apply(
                        "CREATE OR REPLACE FUNCTION transfunc(obj json, cw int, ch int, params json) returns json"
                                +
                                // TODO(security): SQL injection - perhaps use $foo<hard to
                                // guess number>$ ... $foo<#>$ ?
                                " AS $$ "
                                + trans.getTransformFuncBody()
                                + " $$ LANGUAGE plv8");
        // master needs 'stable' for citus to pushdown to workers
        // workers need 'volatile' for pg11 to memoize and not call the function repeatedly per
        // row
        run_citus_dml_ddl2(
                pushdownIndexStmt, sql + " STABLE", sql); // append is safer than replace...

        // by distributing afterwards, loading is ~10x faster (minus a few minutes to distribute
        // the data)
        sql =
                tsql.apply(
                        "SELECT create_distributed_table('bboxtbl', 'citus_distribution_id',"
                                + "colocate_with => 'dbsource')");
        System.out.println(sql);
        pushdownIndexStmt.executeQuery(sql);

        // run transform func, create bboxtbl
        sql =
                tsql.apply(
                        "INSERT INTO bboxtbl(id,x,y,citus_distribution_id,cx,cy,minx,miny,maxx,maxy) "
                                + "SELECT id, x, y, citus_distribution_id, "
                                + "coords[1], coords[2], coords[3], coords[4], coords[5], coords[6] "
                                + "FROM ("
                                + "  SELECT (v->>'id') as id, (v->>'x') as x, (v->>'y') as y, "
                                + "         citus_distribution_id, "
                                + "         bboxfunc(v) coords"
                                + "  FROM ("
                                + "    SELECT transfunc(row_to_json(dbsource),"
                                + c.getW()
                                + ","
                                + c.getH()
                                + ",\'"
                                + Main.getProject().getRenderingParams().replaceAll("\'", "\'\'")
                                + "\'::json) v, citus_distribution_id FROM dbsource"
                                + "  ) sq1"
                                + ") sq2");
        long startts = System.currentTimeMillis();
        System.out.println("pipeline/insertion: " + sql);
        pushdownIndexStmt.executeUpdate(sql);
        long elapsed = System.currentTimeMillis() - startts;
        System.out.println("Running transform func took " + elapsed + " msec");

        // compute geom field in the database, where it can happen in parallel
        Statement setGeomFieldStmt = DbConnector.getStmtByDbName(Config.databaseName);
        sql = "UPDATE " + bboxTableName + " SET geom=box( point(minx,miny), point(maxx,maxy) );";
        System.out.println(sql);
        long startTs = (new Date()).getTime();
        setGeomFieldStmt.executeUpdate(sql);
        setGeomFieldStmt.close();
        long currTs = (new Date()).getTime();
        System.out.println(
                ((currTs - startTs) / 1000) + " secs for setting geom field in parallel");
        startTs = currTs;

        // create index - gist/spgist require logged table type
        // TODO: consider sp-gist
        Statement createIndexStmt = DbConnector.getStmtByDbName(Config.databaseName);
        sql = "CREATE INDEX sp_" + bboxTableName + " ON " + bboxTableName + " USING gist (geom);";
        System.out.println(sql);
        createIndexStmt.executeUpdate(sql);
        createIndexStmt.close();
        currTs = (new Date()).getTime();
        System.out.println(
                ((currTs - startTs) / 1000)
                        + " secs for CREATE INDEX sp_"
                        + bboxTableName
                        + " ON "
                        + bboxTableName
                        + " in parallel");

        // cluster index
        Statement bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);
        sql = "cluster " + bboxTableName + " using sp_" + bboxTableName + ";";
        System.out.println(sql);
        bboxStmt.executeUpdate(sql);
    }
}
