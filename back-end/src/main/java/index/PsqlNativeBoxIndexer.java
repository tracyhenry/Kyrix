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

    // singleton pattern to ensure only one instance existed
    protected PsqlNativeBoxIndexer() {}

    // thread-safe instance getter
    public static synchronized PsqlNativeBoxIndexer getInstance() {

        if (instance == null) instance = new PsqlNativeBoxIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        Layer l = c.getLayers().get(layerId);
        Transform trans = l.getTransform();
        Statement bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);

        // step 0: create tables for storing bboxes and tiles
        String bboxTableName =
                "bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;

        // drop table if exists
        String sql = "drop table if exists " + bboxTableName + ";";
        System.out.println(sql);
        bboxStmt.executeUpdate(sql);

        // create the bbox table
        // yes, citus supports unlogged tables!
        // http://docs.citusdata.com/en/v8.1/performance/performance_tuning.html#postgresql-tuning
        sql = "CREATE UNLOGGED TABLE " + bboxTableName + " (";
        for (int i = 0; i < trans.getColumnNames().size(); i++)
            sql += trans.getColumnNames().get(i) + " text, ";
        sql +=
                "cx double precision, cy double precision, minx double precision, miny double precision, maxx double precision, maxy double precision, geom box)";
        System.out.println(sql);
        bboxStmt.executeUpdate(sql);

        // if this is an empty layer, return
        if (trans.getDb().equals("")) return;

        // step 1: set up nashorn environment for running javascript code
        NashornScriptEngine engine = null;
        if (!trans.getTransformFunc().equals("")) engine = setupNashorn(trans.getTransformFunc());

        // step 2: looping through query results
        // TODO: distinguish between separable and non-separable cases
        String transDb = trans.getDb();
        String transQuery = trans.getQuery();
        System.out.println("db=" + transDb + " - query=" + transQuery);
        Statement rawDBStmt = DbConnector.getStmtByDbName(transDb, true);
        ResultSet rs = DbConnector.getQueryResultIterator(rawDBStmt, transQuery);
        int numColumn = rs.getMetaData().getColumnCount();
        int rowCount = 0;
        String insertSql = "INSERT INTO " + bboxTableName + " VALUES (";
        // for debugging, vary number of spaces after the commas
        for (int i = 0; i < trans.getColumnNames().size(); i++) insertSql += "?,";
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
            for (int i = 1; i <= numColumn; i++)
                curRawRow.add(rs.getString(i) == null ? "" : rs.getString(i));

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

        // compute geom field in the database, where it can happen in parallel
        sql = "UPDATE " + bboxTableName + " SET geom=box( point(minx,miny), point(maxx,maxy) );";
        System.out.println(sql);
        bboxStmt.executeUpdate(sql);

        currTs = (new Date()).getTime();
        System.out.println(((currTs - startTs) / 1000) + " secs for setting geom field");
        startTs = currTs;

        // create index - gist/spgist require logged table type
        // TODO: consider sp-gist
        sql = "CREATE INDEX sp_" + bboxTableName + " ON " + bboxTableName + " USING gist (geom);";
        System.out.println(sql);
        bboxStmt.executeUpdate(sql);

        currTs = (new Date()).getTime();
        System.out.println(
                ((currTs - startTs) / 1000)
                        + " secs for CREATE INDEX sp_"
                        + bboxTableName
                        + " ON "
                        + bboxTableName);

        // cluster index
        sql = "cluster " + bboxTableName + " using sp_" + bboxTableName + ";";
        System.out.println(sql);
        bboxStmt.executeUpdate(sql);
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
