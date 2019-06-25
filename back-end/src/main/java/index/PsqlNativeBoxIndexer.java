package index;

import box.Box;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Date;
import java.util.function.*;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Layer;
import project.Transform;

public class PsqlNativeBoxIndexer extends BoundingBoxIndexer {

    private static PsqlNativeBoxIndexer instance = null;
    private static boolean isCitus = false;

    // singleton pattern to ensure only one instance existed
    private PsqlNativeBoxIndexer(boolean isCitus) {
        this.isCitus = isCitus;
    }

    // thread-safe instance getter
    public static synchronized PsqlNativeBoxIndexer getInstance(boolean isCitus) {

        if (instance == null) instance = new PsqlNativeBoxIndexer(isCitus);
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
        if (isCitus) {
            sql += "citus_distribution_id int, ";
        }
        sql +=
                "cx double precision, cy double precision, minx double precision, miny double precision, maxx double precision, maxy double precision, geom box)";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);
        dropCreateStmt.close();

        // if this is an empty layer, return
        if (trans.getDb().equals("")) return;

        // if this is an empty layer, return
        if (trans.getDb().equals("src_db_same_as_kyrix")) {

            // TODO: replace me.
            System.out.println(
                    "Transform database marked 'src_db_same_as_kyrix' - trying to pushdown...");
            Statement pushdownIndexStmt = DbConnector.getStmtByDbName(Config.databaseName);

            String transformResultType = bboxTableName + "_transform_response_type";
            String transformFuncName = bboxTableName + "_transform_func";
            String bboxFuncName = bboxTableName + "_bbox_func";
            UnaryOperator<String> tsql =
                    (sqlstr) -> {
                        return (sqlstr.replaceAll("transtype", transformResultType)
                                .replaceAll("transfunc", transformFuncName)
                                .replaceAll("bboxfunc", bboxFuncName)
                                .replaceAll("bboxtbl", bboxTableName)
                                .replaceAll("dbsource", trans.getDbsource())
                                .replaceAll("CANVAS_WIDTH", String.valueOf(c.getW()))
                                .replaceAll("CANVAS_HEIGHT", String.valueOf(c.getH())));
                    };

            // register transform JS function with Postgres/Citus
            run_citus_dml_ddl(
                    pushdownIndexStmt, tsql.apply("DROP TYPE IF EXISTS transtype CASCADE"));
            run_citus_dml_ddl(
                    pushdownIndexStmt,
                    tsql.apply("CREATE TYPE transtype as (id bigint,x int,y int)"));
            run_citus_dml_ddl(pushdownIndexStmt, tsql.apply("DROP FUNCTION IF EXISTS transfunc"));

            String transFuncStr = trans.getTransformFunc();
            // TODO: analyze trans.getTransformFunc() to find arguments - for now, hardcode

            // TODO: generate bbox func - see Indexer.getBboxCoordinates()

            sql =
                    tsql.apply(
                            "CREATE OR REPLACE FUNCTION bboxfunc(id bigint,x int,y int) returns kyrix_bbox_coords_type"
                                    + " AS $$ return { cx: x, cy: y, minx: x-0.5, miny: y-0.5, maxx: x+0.5, maxy: y+0.5, }"
                                    + "$$ LANGUAGE plv8");
            // master needs 'stable' for citus to pushdown to workers
            // workers need 'volatile' for pg11 to memoize and not call the function repeatedly per
            // row
            run_citus_dml_ddl2(
                    pushdownIndexStmt, sql + " STABLE", sql); // append is safer than replace...

            sql =
                    tsql.apply(
                            "CREATE OR REPLACE FUNCTION transfunc(id bigint,w int,h int) returns transtype"
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

            sql = "SET citus.task_executor_type = 'task-tracker';";
            System.out.println(sql);
            pushdownIndexStmt.executeUpdate(sql);

            for (int i = 0; i < 100; i++) {
                // break into 100 steps so we can hopefully see progress
                sql =
                        tsql.apply(
                                "INSERT INTO bboxtbl(id,x,y,citus_distribution_id,cx,cy,minx,miny,maxx,maxy) "
                                        + "SELECT id, x, y, citus_distribution_id, "
                                        + "(coords::kyrix_bbox_coords_type).cx, (coords::kyrix_bbox_coords_type).cy,"
                                        + "(coords::kyrix_bbox_coords_type).minx, (coords::kyrix_bbox_coords_type).miny,"
                                        + "(coords::kyrix_bbox_coords_type).maxx, (coords::kyrix_bbox_coords_type).maxy "
                                        + "FROM ("
                                        +
                                        // TODO: replace v:: args with parsed results from the trans
                                        // func
                                        "  SELECT (v::transtype).id, (v::transtype).x, (v::transtype).y, "
                                        + "         citus_distribution_id, "
                                        +
                                        // TODO: replace v:: args with parsed results from the trans
                                        // func
                                        // TODO: can we inline bboxfunc?  could be easier than
                                        // another plv8 func...
                                        "         bboxfunc( (v::transtype).id, (v::transtype).x, (v::transtype).y ) coords"
                                        + "  FROM ("
                                        +
                                        // TODO: replace args to transfunc with parsed args from the
                                        // func decl
                                        "    SELECT transfunc(id,w,h) v, citus_distribution_id FROM dbsource "
                                        + "    WHERE w % 100 = "
                                        + i
                                        + "  ) sq1"
                                        + ") sq2");
                long startts = System.nanoTime();
                if (i % 20 == 0)
                    System.out.println("pipeline/insertion stage " + i + " of 100: " + sql);
                pushdownIndexStmt.executeUpdate(sql);
                long elapsed = System.nanoTime() - startts;
                if (i % 20 == 0)
                    System.out.println("stage " + i + " took " + (elapsed / 1000000) + " msec");
            }

            // compute geom field in the database, where it can happen in parallel
            Statement setGeomFieldStmt = DbConnector.getStmtByDbName(Config.databaseName);
            sql =
                    "UPDATE "
                            + bboxTableName
                            + " SET geom=box( point(minx,miny), point(maxx,maxy) );";
            System.out.println(sql);
            long startTs = (new Date()).getTime();
            setGeomFieldStmt.executeUpdate(sql);
            setGeomFieldStmt.close();
            long currTs = (new Date()).getTime();
            System.out.println(
                    ((currTs - startTs) / 1000)
                            + " secs for setting geom field"
                            + (isCitus ? " in parallel" : ""));
            startTs = currTs;

            // create index - gist/spgist require logged table type
            // TODO: consider sp-gist
            Statement createIndexStmt = DbConnector.getStmtByDbName(Config.databaseName);
            sql =
                    "CREATE INDEX sp_"
                            + bboxTableName
                            + " ON "
                            + bboxTableName
                            + " USING gist (geom);";
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
                            + (isCitus ? " in parallel" : ""));
            startTs = currTs;

            return;
        }

        // step 1: set up nashorn environment for running javascript code
        NashornScriptEngine engine = null;
        if (!trans.getTransformFunc().equals("")) engine = setupNashorn(trans.getTransformFunc());

        // step 2: looping through query results
        // TODO: distinguish between separable and non-separable cases
        String transDb = trans.getDb();
        String transQuery = trans.getQuery();
        System.out.println("db=" + transDb + " - query=" + transQuery);
        Statement rawDBStmt = DbConnector.getStmtByDbName(transDb);
        ResultSet rs = DbConnector.getQueryResultIterator(rawDBStmt, transQuery);
        int numColumn = rs.getMetaData().getColumnCount();
        int rowCount = 0;
        String insertSql = "INSERT INTO " + bboxTableName + " VALUES (";
        // for debugging, vary number of spaces after the commas
        for (int i = 0; i < trans.getColumnNames().size(); i++) {
            insertSql += "?,";
        }
        if (isCitus) insertSql += "?,";
        insertSql += "?,?,?,?,?,?)";
        System.out.println(insertSql);
        PreparedStatement preparedStmt =
                DbConnector.getPreparedStatement(Config.databaseName, insertSql);
        long startTs = (new Date()).getTime();
        long lastTs = startTs;
        long currTs = 0;
        long secs = 0;
        int numcols = 0;
        int batchsize = Config.bboxBatchSize;
        boolean isNullTransform = trans.getTransformFunc().equals("");
        System.out.println(
                "batchsize="
                        + String.valueOf(batchsize)
                        + "  numColumn="
                        + String.valueOf(numColumn));
        while (rs.next()) {

            // count log - important to increment early so modulo-zero doesn't trigger on first
            // iteration
            rowCount++;

            // get raw row
            ArrayList<String> curRawRow = new ArrayList<>();
            for (int i = 1; i <= numColumn; i++) curRawRow.add(rs.getString(i));

            // step 3: run transform function on this tuple
            ArrayList<String> transformedRow =
                    isNullTransform ? curRawRow : getTransformedRow(c, curRawRow, engine);

            // step 4: calculate bounding boxes
            ArrayList<Double> curBbox = getBboxCoordinates(l, transformedRow);

            // insert into bbox table
            if (numcols == 0) {
                numcols = trans.getColumnNames().size();
                System.out.println("numcols=" + String.valueOf(numcols));
            }
            int pscol = 1;
            for (int i = 0; i < numcols; i++)
                preparedStmt.setString(pscol++, transformedRow.get(i).replaceAll("\'", "\'\'"));
            if (isCitus) preparedStmt.setDouble(pscol++, rowCount);
            for (int i = 0; i < 6; i++) preparedStmt.setDouble(pscol++, curBbox.get(i));
            preparedStmt.addBatch();
            if (rowCount % batchsize == 0) {
                preparedStmt.executeBatch();
            }
            if (rowCount % 1000 == 0) {
                // perf: only measure to the nearest 1K recs/sec
                // getTime() is expensive
                currTs = (new Date()).getTime();
                if (currTs / 10000 > lastTs / 10000) { // print every N=10 seconds
                    lastTs = currTs;
                    secs = (currTs - startTs) / 1000;
                    if (secs > 0) {
                        System.out.println(
                                secs
                                        + " secs: "
                                        + rowCount
                                        + " records inserted. "
                                        + (rowCount / secs)
                                        + " recs/sec.");
                    }
                }
            }
        }

        // insert tail stuff
        if (rowCount % batchsize != 0) {
            preparedStmt.executeBatch();
        }
        preparedStmt.close();

        // close reader connection
        rs.close();
        rawDBStmt.close();
        DbConnector.closeConnection(trans.getDb());

        startTs = (new Date()).getTime();

        // TODO: move to parallel kyrix-indexing: pushdown this computation into the DB and run on
        // each shard independently.
        if (isCitus) {
            Statement distributeStmt = DbConnector.getStmtByDbName(Config.databaseName);

            // by distributing afterwards, loading is ~10x faster (minus a few minutes to distribute
            // the data)
            sql =
                    "SELECT create_distributed_table('"
                            + bboxTableName
                            + "', 'citus_distribution_id');";
            System.out.println(sql);
            distributeStmt.executeQuery(sql);

            // citus leaves leftover data on master when distributing non-empty tables - who knows
            // why?
            sql =
                    "BEGIN; SET LOCAL citus.enable_ddl_propagation TO off; TRUNCATE "
                            + bboxTableName
                            + "; END;";
            System.out.println(sql);
            distributeStmt.executeUpdate(sql);
            distributeStmt.close();

            currTs = (new Date()).getTime();
            System.out.println(
                    ((currTs - startTs) / 1000) + " secs for create_distributed_table()");
            startTs = currTs;
        }

        // compute geom field in the database, where it can happen in parallel
        Statement setGeomFieldStmt = DbConnector.getStmtByDbName(Config.databaseName);
        sql = "UPDATE " + bboxTableName + " SET geom=box( point(minx,miny), point(maxx,maxy) );";
        System.out.println(sql);
        setGeomFieldStmt.executeUpdate(sql);
        setGeomFieldStmt.close();

        currTs = (new Date()).getTime();
        System.out.println(
                ((currTs - startTs) / 1000)
                        + " secs for setting geom field"
                        + (isCitus ? " in parallel" : ""));
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
                        + (isCitus ? " in parallel" : ""));
        startTs = currTs;

        // don't use clustering
        // sql = "cluster " + bboxTableName + " using sp_" + bboxTableName + ";";
        // System.out.println(sql);
        // bboxStmt.executeUpdate(sql);
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromRegion(
            Canvas c, int layerId, String regionWKT, String predicate, Box newBox, Box oldBox)
            throws Exception {

        // get column list string
        String colListStr = c.getLayers().get(layerId).getColStr("");

        // construct range query
        String sql =
                "select "
                        + colListStr
                        + " from bbox_"
                        + Main.getProject().getName()
                        + "_"
                        + c.getId()
                        + "layer"
                        + layerId
                        + " where ";
        sql += "geom && box('" + newBox.getCSV() + "')";
        if (oldBox.getWidth() > 0) // when there is not an old box, oldBox is set to -1e5, -1e5,...
        sql += "and not (geom && box('" + oldBox.getCSV() + "') )";
        if (predicate.length() > 0) sql += " and " + predicate + ";";
        System.out.println(sql);

        // return
        return DbConnector.getQueryResult(Config.databaseName, sql);
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromTile(
            Canvas c, int layerId, int minx, int miny, String predicate) throws Exception {

        // get column list string
        String colListStr = c.getLayers().get(layerId).getColStr("");

        // construct range query
        String sql =
                "select "
                        + colListStr
                        + " from bbox_"
                        + Main.getProject().getName()
                        + "_"
                        + c.getId()
                        + "layer"
                        + layerId
                        + " where ";
        String boxStr =
                "geom && box( '"
                        + minx
                        + ","
                        + miny
                        + ","
                        + (minx + Config.tileW)
                        + ","
                        + (miny + Config.tileH)
                        + "')";
        sql += boxStr;
        if (predicate.length() > 0) sql += " and " + predicate;
        sql += ";";
        System.out.println(boxStr + " : " + sql);

        // return
        return DbConnector.getQueryResult(Config.databaseName, sql);
    }
}
