package index;

import box.Box;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Layer;
import project.Transform;

/** Created by wenbo on 12/30/18. */
public class PsqlGridCompressIndexer extends BoundingBoxIndexer {

    private static PsqlGridCompressIndexer instance = null;
    private final int gridW = 1000;
    private final int gridH = 1000;
    private final int batchSize = 10000000;
    private final int updBatchSize = 5000;

    // singleton pattern to ensure only one instance existed
    private PsqlGridCompressIndexer() {}

    // thread-safe instance getter
    public static synchronized PsqlGridCompressIndexer getInstance() {

        if (instance == null) instance = new PsqlGridCompressIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        Statement bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);

        // create postgis extension if not existed
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

        // step 0: create tables for storing upgrouped grids
        String ungroupedTableName =
                "bbox_ungrouped_"
                        + Main.getProject().getName()
                        + "_"
                        + c.getId()
                        + "layer"
                        + layerId;
        // drop table if exists
        String sql = "drop table if exists " + ungroupedTableName + ";";
        bboxStmt.executeUpdate(sql);
        // create the bbox table
        sql =
                "create table "
                        + ungroupedTableName
                        + " (grid_x int, grid_y int, compressed_blob text, "
                        + "minx double precision, miny double precision, "
                        + "maxx double precision, maxy double precision);";
        bboxStmt.executeUpdate(sql);

        // if this is an empty layer, return
        if (trans.getDb().equals("")) return;

        // step 1: set up nashorn environment, prepared statement, column name to id mapping
        NashornScriptEngine engine = null;
        if (!trans.getTransformFunc().equals("")) engine = setupNashorn(trans.getTransformFunc());

        // step 2: looping through query results
        // TODO: distinguish between separable and non-separable cases

        // prepared statements
        String insertSql = "insert into " + ungroupedTableName + " values (?, ?, ?, ?, ?, ?, ?);";
        PreparedStatement insPrepStmt =
                DbConnector.getPreparedStatement(Config.databaseName, insertSql);

        // in-memory structures to maintain for each batch of records
        HashMap<String, StringBuilder> blobs = new HashMap<>();
        HashMap<String, Box> boxes = new HashMap<>();

        // fetch query result
        long st = System.currentTimeMillis();
        long lastBatchSt = st;
        System.out.println("\nConstructing ungrouped table...");

        int rowCount = 0, insCount;
        int numColumn = rs.getMetaData().getColumnCount();
        while (true) {

            // count log
            boolean hasNext = rs.next();
            rowCount++;

            // flush stuff in blobs and boxes to the database
            if (rowCount % batchSize == 0 || !hasNext) {
                System.out.println(
                        "In-memory processing for this batch: "
                                + (System.currentTimeMillis() - lastBatchSt) / 1000.0
                                + "s.");
                System.out.println(rowCount);
                insCount = 0;
                for (String gridKey : blobs.keySet()) {

                    // grid_x and grid_y
                    int gridX = Integer.valueOf(gridKey.split("_")[0]);
                    int gridY = Integer.valueOf(gridKey.split("_")[1]);

                    // get current blob and bbox
                    StringBuilder curBlob = blobs.get(gridKey);
                    Box curBbox = boxes.get(gridKey);

                    // new record
                    insPrepStmt.setInt(1, gridX);
                    insPrepStmt.setInt(2, gridY);
                    insPrepStmt.setString(3, curBlob.toString());
                    insPrepStmt.setDouble(4, curBbox.getMinx());
                    insPrepStmt.setDouble(5, curBbox.getMiny());
                    insPrepStmt.setDouble(6, curBbox.getMaxx());
                    insPrepStmt.setDouble(7, curBbox.getMaxy());
                    insPrepStmt.addBatch();
                    insCount++;
                    if (insCount % updBatchSize == 0) insPrepStmt.executeBatch();
                }
                System.out.println("Insertion count: " + insCount);
                insPrepStmt.executeBatch();
                blobs.clear();
                boxes.clear();
                lastBatchSt = System.currentTimeMillis();
            }
            if (!hasNext) break;

            // get raw row
            ArrayList<String> curRawRow = new ArrayList<>();
            for (int i = 1; i <= numColumn; i++) curRawRow.add(rs.getString(i));

            // step 3: run transform function on this tuple
            ArrayList<String> transformedRow;
            if (!trans.getTransformFunc().equals(""))
                transformedRow = getTransformedRow(c, curRawRow, engine);
            else transformedRow = curRawRow;

            // step 4: calculate bounding boxes
            ArrayList<Double> bbox = getBboxCoordinates(l, transformedRow);
            double minx, miny, maxx, maxy;
            minx = bbox.get(2);
            miny = bbox.get(3);
            maxx = bbox.get(4);
            maxy = bbox.get(5);

            // grid indexes
            int gridX = bbox.get(0).intValue() / gridW;
            int gridY = bbox.get(1).intValue() / gridH;
            String gridKey = String.valueOf(gridX) + "_" + String.valueOf(gridY);

            // update blob
            if (!blobs.containsKey(gridKey)) blobs.put(gridKey, new StringBuilder());
            StringBuilder curBlob = blobs.get(gridKey);
            if (curBlob.length() > 0) curBlob.append("__");
            curBlob.append(transformedRow.get(0));
            for (int i = 1; i < transformedRow.size(); i++)
                curBlob.append("&&" + transformedRow.get(i));
            for (int i = 0; i < bbox.size(); i++)
                curBlob.append("&&" + String.valueOf(bbox.get(i)));

            // update bounding box
            if (!boxes.containsKey(gridKey)) boxes.put(gridKey, new Box(minx, miny, maxx, maxy));
            else {
                Box curBox = boxes.get(gridKey);
                minx = Math.min(minx, curBox.getMinx());
                miny = Math.min(miny, curBox.getMiny());
                maxx = Math.max(maxx, curBox.getMaxx());
                maxy = Math.max(maxy, curBox.getMaxy());
                boxes.put(gridKey, new Box(minx, miny, maxx, maxy));
            }
        }
        rs.close();
        rawDBStmt.close();
        DbConnector.closeConnection(trans.getDb());
        insPrepStmt.close();
        System.out.println(
                "Constructing ungrouped table: "
                        + (System.currentTimeMillis() - st) / 1000.0
                        + "s.");

        // create another table storing grouped grids
        st = System.currentTimeMillis();
        String groupedTableName =
                "bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;
        // drop table if exists
        sql = "drop table if exists " + groupedTableName + ";";
        bboxStmt.executeUpdate(sql);
        // create the bbox table
        sql =
                "create table "
                        + groupedTableName
                        + " (compressed_blob text, geom geometry(polygon));";
        bboxStmt.executeUpdate(sql);

        // prepared statements
        insertSql = "insert into " + groupedTableName + " values (?, ST_GeomFromText(?));";
        insPrepStmt = DbConnector.getPreparedStatement(Config.databaseName, insertSql);

        // info of current group
        int curGridX = -1, curGridY = -1;
        double curMinX = -1, curMinY = -1, curMaxX = -1, curMaxY = -1;
        StringBuilder curBlob = new StringBuilder();

        // read from upgrouped table and construct the grouped table
        sql = "select * from " + ungroupedTableName + " order by grid_x asc, grid_y asc;";
        Statement ungroupedStmt = DbConnector.getStmtByDbName(Config.databaseName, true);
        rs = DbConnector.getQueryResultIterator(ungroupedStmt, sql);
        rowCount = insCount = 0;
        System.out.println("\nConstructing grouped table...");
        while (rs.next()) {
            rowCount++;
            if (rowCount % 1000000 == 0) System.out.println(rowCount);
            int gridX = rs.getInt(1);
            int gridY = rs.getInt(2);
            if (gridX != curGridX || gridY != curGridY) {
                // insert the last one
                if (curGridX != -1) {
                    insPrepStmt.setString(1, curBlob.toString());
                    insPrepStmt.setString(2, getPolygonText(curMinX, curMinY, curMaxX, curMaxY));
                    insPrepStmt.addBatch();
                    insCount++;
                    if (insCount % updBatchSize == 0) insPrepStmt.executeBatch();
                }
                curGridX = gridX;
                curGridY = gridY;
                curMinX = rs.getDouble(4);
                curMinY = rs.getDouble(5);
                curMaxX = rs.getDouble(6);
                curMaxY = rs.getDouble(7);
                curBlob = new StringBuilder(rs.getString(3));
            } else {
                // merge
                curBlob.append("__");
                curBlob.append(rs.getString(3));
                curMinX = Math.min(curMinX, rs.getDouble(4));
                curMinY = Math.min(curMinY, rs.getDouble(5));
                curMaxX = Math.max(curMaxX, rs.getDouble(6));
                curMaxY = Math.max(curMaxY, rs.getDouble(7));
            }
        }
        rs.close();
        ungroupedStmt.close();
        insPrepStmt.executeBatch();
        insPrepStmt.close();
        System.out.println(
                "Constructing grouped table: " + (System.currentTimeMillis() - st) / 1000.0 + "s.");

        // create index
        st = System.currentTimeMillis();
        sql =
                "create index sp_"
                        + groupedTableName
                        + " on "
                        + groupedTableName
                        + " using gist (geom);";
        bboxStmt.executeUpdate(sql);
        sql = "cluster " + groupedTableName + " using sp_" + groupedTableName + ";";
        bboxStmt.executeUpdate(sql);
        System.out.println("Indexing: " + (System.currentTimeMillis() - st) / 1000.0 + "s.");
        System.out.println();
        bboxStmt.close();
        DbConnector.closeConnection(Config.databaseName);
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromRegion(
            Canvas c, int layerId, String regionWKT, String predicate, Box newBox, Box oldBox)
            throws Exception {

        // construct range query
        String sql =
                "select compressed_blob from bbox_"
                        + Main.getProject().getName()
                        + "_"
                        + c.getId()
                        + "layer"
                        + layerId
                        + " where ST_Intersects(st_GeomFromText";
        sql += "('" + regionWKT + "'), geom)";
        if (predicate.length() > 0) sql += " and " + predicate + ";";
        System.out.println(sql);

        // get compressed tuples
        ArrayList<ArrayList<String>> compressedTuples =
                DbConnector.getQueryResult(Config.databaseName, sql);
        ArrayList<ArrayList<String>> ret = new ArrayList<>();
        for (int i = 0; i < compressedTuples.size(); i++) {
            String tupleBlob = compressedTuples.get(i).get(0);
            String[] tupleStrs = tupleBlob.split("__");
            for (String tupleStr : tupleStrs)
                ret.add(new ArrayList<>(Arrays.asList(tupleStr.split("&&"))));
        }

        return ret;
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromTile(
            Canvas c, int layerId, int minx, int miny, String predicate) throws Exception {
        return null;
    }
}
