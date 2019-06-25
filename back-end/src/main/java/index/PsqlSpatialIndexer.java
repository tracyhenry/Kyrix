package index;

import box.Box;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Date;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Layer;
import project.Transform;

/** Created by wenbo on 12/30/18. */
public class PsqlSpatialIndexer extends BoundingBoxIndexer {

    private static PsqlSpatialIndexer instance = null;
    private static boolean isCitus = false;

    // singleton pattern to ensure only one instance existed
    protected PsqlSpatialIndexer() {}

    private PsqlSpatialIndexer(boolean isCitus) {
        this.isCitus = isCitus;
    }

    // thread-safe instance getter
    public static synchronized PsqlSpatialIndexer getInstance(boolean isCitus) {

        if (instance == null) instance = new PsqlSpatialIndexer(isCitus);
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        Statement bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);

        // create postgis extension if not existed
        System.out.println("running create extension for postgis/postgis_topology");
        String psql = "CREATE EXTENSION if not exists postgis;";
        bboxStmt.executeUpdate(psql);
        psql = "CREATE EXTENSION if not exists postgis_topology;";
        bboxStmt.executeUpdate(psql);

        // set up query iterator
        Layer l = c.getLayers().get(layerId);
        Transform trans = l.getTransform();
        Statement rawDBStmt =
                (trans.getDb().isEmpty() ? null : DbConnector.getStmtByDbName(trans.getDb(), true));
        ResultSet rs =
                (trans.getDb().isEmpty()
                        ? null
                        : DbConnector.getQueryResultIterator(rawDBStmt, trans.getQuery()));

        // step 0: create tables for storing bboxes and tiles
        String bboxTableName =
                "bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;

        // drop table if exists
        String sql = "drop table if exists " + bboxTableName + ";";
        System.out.println(sql);
        bboxStmt.executeUpdate(sql);

        // create the bbox table
        sql = "create table " + bboxTableName + " (";
        for (int i = 0; i < trans.getColumnNames().size(); i++)
            sql += trans.getColumnNames().get(i) + " text, ";
        if (isCitus) {
            sql += "citus_distribution_id int, ";
        }
        sql +=
                "cx double precision, cy double precision, minx double precision, miny double precision, maxx double precision, maxy double precision, geom geometry(polygon));";
        System.out.println(sql);
        bboxStmt.executeUpdate(sql);

        if (isCitus) {
            sql =
                    "SELECT create_distributed_table('"
                            + bboxTableName
                            + "', 'citus_distribution_id');";
            System.out.println(sql);
            bboxStmt.executeQuery(sql);
        }

        // if this is an empty layer, return
        if (trans.getDb().isEmpty()) return;

        // step 1: set up nashorn environment for running javascript code
        NashornScriptEngine engine = null;
        if (!trans.getTransformFunc().isEmpty()) engine = setupNashorn(trans.getTransformFunc());

        // step 2: looping through query results
        // TODO: distinguish between separable and non-separable cases
        String insertSql = "insert into " + bboxTableName + " values (";
        for (int i = 0; i < trans.getColumnNames().size() + 6; i++) insertSql += "?, ";
        if (isCitus) {
            insertSql += "?, ";
        }
        insertSql += "ST_GeomFromText(?));";

        System.out.println(insertSql);
        PreparedStatement preparedStmt =
                DbConnector.getPreparedStatement(Config.databaseName, insertSql);
        long startTs = (new Date()).getTime();
        long lastTs = startTs;
        int rowCount = 0;
        int numColumn = rs.getMetaData().getColumnCount();
        while (rs.next()) {

            // count log
            rowCount++;
            if (rowCount % 1000 == 0) {
                long currTs = (new Date()).getTime();
                if (currTs / 5000 > lastTs / 5000) {
                    lastTs = currTs;
                    long secs = (currTs - startTs) / 1000;
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

            // get raw row
            ArrayList<String> curRawRow = new ArrayList<>();
            for (int i = 1; i <= numColumn; i++) curRawRow.add(rs.getString(i));

            // step 3: run transform function on this tuple
            ArrayList<String> transformedRow;
            if (!trans.getTransformFunc().isEmpty())
                transformedRow = getTransformedRow(c, curRawRow, engine);
            else transformedRow = curRawRow;

            // step 4: calculate bounding boxes
            ArrayList<Double> curBbox = getBboxCoordinates(l, transformedRow);

            // insert into bbox table
            int pscol = 1;
            for (int i = 0; i < transformedRow.size(); i++)
                preparedStmt.setString(pscol++, transformedRow.get(i).replaceAll("\'", "\'\'"));
            if (isCitus) {
                // row number is a fine distribution key (for now) - round robin across the cluster
                preparedStmt.setInt(pscol++, rowCount);
            }
            for (int i = 0; i < 6; i++) preparedStmt.setDouble(pscol++, curBbox.get(i));

            double minx, miny, maxx, maxy;
            minx = curBbox.get(2);
            miny = curBbox.get(3);
            maxx = curBbox.get(4);
            maxy = curBbox.get(5);
            preparedStmt.setString(pscol++, getPolygonText(minx, miny, maxx, maxy));
            preparedStmt.addBatch();

            if (rowCount % Config.bboxBatchSize == 0) preparedStmt.executeBatch();
        }
        rs.close();
        rawDBStmt.close();
        DbConnector.closeConnection(trans.getDb());

        // insert tail stuff
        if (rowCount % Config.bboxBatchSize != 0) preparedStmt.executeBatch();
        preparedStmt.close();

        // create index
        sql = "create index sp_" + bboxTableName + " on " + bboxTableName + " using gist (geom);";
        bboxStmt.executeUpdate(sql);
        sql = "cluster " + bboxTableName + " using sp_" + bboxTableName + ";";
        bboxStmt.executeUpdate(sql);
        bboxStmt.close();
        DbConnector.closeConnection(Config.databaseName);
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromRegion(
            Canvas c, int layerId, String regionWKT, String predicate, Box newBox, Box oldBox)
            throws Exception {

        // get column list string
        String colListStr = c.getLayers().get(layerId).getColStr("");

        System.out.println("in psql spatial indexer");
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
                        + " where ST_Intersects(st_GeomFromText";
        sql += "('" + regionWKT + "'), geom)";
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
        sql +=
                "st_intersects(st_GeomFromText('Polygon(("
                        + minx
                        + " "
                        + miny
                        + ","
                        + (minx + Config.tileW)
                        + " "
                        + miny;
        sql +=
                ","
                        + (minx + Config.tileW)
                        + " "
                        + (miny + Config.tileH)
                        + ","
                        + minx
                        + " "
                        + (miny + Config.tileH)
                        + ","
                        + minx
                        + " "
                        + miny
                        + "))'),geom)";
        if (predicate.length() > 0) sql += " and " + predicate + ";";
        System.out.println(minx + " " + miny + " : " + sql);

        // return
        return DbConnector.getQueryResult(Config.databaseName, sql);
    }
}
