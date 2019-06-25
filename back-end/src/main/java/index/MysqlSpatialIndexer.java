package index;

import box.Box;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Layer;
import project.Transform;

/** Created by wenbo on 12/31/18. */
public class MysqlSpatialIndexer extends BoundingBoxIndexer {

    private static MysqlSpatialIndexer instance = null;

    // singleton pattern to ensure only one instance existed
    private MysqlSpatialIndexer() {}

    // thread-safe instance getter
    public static synchronized MysqlSpatialIndexer getInstance() {

        if (instance == null) instance = new MysqlSpatialIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        // TODO: switch to prepared statements
        Statement bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);

        // run query and set column names if not existed
        Layer l = c.getLayers().get(layerId);
        Transform trans = l.getTransform();
        Statement rawDBStmt =
                (trans.getDb().isEmpty() ? null : DbConnector.getStmtByDbName(trans.getDb()));
        ResultSet rs =
                (trans.getDb().isEmpty()
                        ? null
                        : DbConnector.getQueryResultIterator(rawDBStmt, trans.getQuery()));

        // step 0: create tables for storing bboxes and tiles
        String bboxTableName =
                "bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;

        // drop table if exists
        String sql = "drop table if exists " + bboxTableName + ";";
        bboxStmt.executeUpdate(sql);

        // create the bbox table
        sql = "create table " + bboxTableName + " (";
        for (int i = 0; i < trans.getColumnNames().size(); i++)
            sql += trans.getColumnNames().get(i) + " mediumtext, ";
        sql +=
                "cx double precision, cy double precision, minx double precision, miny double precision, "
                        + "maxx double precision, maxy double precision, geom polygon not null, spatial index (geom));";
        bboxStmt.executeUpdate(sql);

        // if this is an empty layer, return
        if (trans.getDb().isEmpty()) return;

        // step 1: set up nashorn environment, prepared statement, column name to id mapping
        NashornScriptEngine engine = null;
        if (!trans.getTransformFunc().isEmpty()) engine = setupNashorn(trans.getTransformFunc());

        // step 2: looping through query results
        // TODO: distinguish between separable and non-separable cases
        StringBuilder bboxInsSqlBuilder =
                new StringBuilder("insert into " + bboxTableName + " values");

        int rowCount = 0;
        int numColumn = rs.getMetaData().getColumnCount();
        while (rs.next()) {

            // count log
            rowCount++;
            if (rowCount % 1000000 == 0) System.out.println(rowCount);

            // get raw row
            ArrayList<String> curRawRow = new ArrayList<>();
            for (int i = 1; i <= numColumn; i++) curRawRow.add(rs.getString(i));

            // step 3: run transform function on this tuple
            ArrayList<String> transformedRow;
            if (!trans.getTransformFunc().isEmpty())
                transformedRow = getTransformedRow(c, curRawRow, engine);
            else transformedRow = curRawRow;

            // step 4: get bounding boxes coordinates
            ArrayList<Double> curBbox = Indexer.getBboxCoordinates(l, transformedRow);

            // insert into bbox table
            if (bboxInsSqlBuilder.charAt(bboxInsSqlBuilder.length() - 1) == ')')
                bboxInsSqlBuilder.append(",(");
            else bboxInsSqlBuilder.append(" (");
            for (int i = 0; i < transformedRow.size(); i++)
                bboxInsSqlBuilder.append(
                        "'" + transformedRow.get(i).replaceAll("\'", "\\\\'") + "', ");
            for (int i = 0; i < 6; i++)
                bboxInsSqlBuilder.append(String.valueOf(curBbox.get(i)) + ", ");

            double minx, miny, maxx, maxy;
            minx = curBbox.get(2);
            miny = curBbox.get(3);
            maxx = curBbox.get(4);
            maxy = curBbox.get(5);
            bboxInsSqlBuilder.append("ST_GeomFromText('");
            bboxInsSqlBuilder.append(getPolygonText(minx, miny, maxx, maxy));
            bboxInsSqlBuilder.append("'))");

            if (rowCount % Config.bboxBatchSize == 0) {
                bboxInsSqlBuilder.append(";");
                bboxStmt.executeUpdate(bboxInsSqlBuilder.toString());
                bboxInsSqlBuilder = new StringBuilder("insert into " + bboxTableName + " values");
            }
        }
        rs.close();
        rawDBStmt.close();
        DbConnector.closeConnection(trans.getDb());

        // insert tail stuff
        if (rowCount % Config.bboxBatchSize != 0) {
            bboxInsSqlBuilder.append(";");
            bboxStmt.executeUpdate(bboxInsSqlBuilder.toString());
        }

        // close db connections
        bboxStmt.close();
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
                        + " where MBRIntersects(GeomFromText";
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
                "MBRIntersects(st_GeomFromText('Polygon(("
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
