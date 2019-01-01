package index;

import box.Box;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Layer;
import project.Transform;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;

/**
 * Created by wenbo on 12/30/18.
 */
public class PsqlGridCompressIndexer extends Indexer {

    private static PsqlGridCompressIndexer instance = null;
    private final int gridW = 10000;
    private final int gridH = 10000;
    private final int batchSize = 10000000;
    private final int updBatchSize = 1000;

    // singleton pattern to ensure only one instance existed
    private PsqlGridCompressIndexer() {}

    // thread-safe instance getter
    public static synchronized PsqlGridCompressIndexer getInstance() {

        if (instance == null)
            instance = new PsqlGridCompressIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception  {

        Statement bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);
        Connection dbConn = DbConnector.getDbConn(Config.dbServer, Config.databaseName, Config.userName, Config.password);

        // create postgis extension if not existed
        String psql = "CREATE EXTENSION if not exists postgis;";
        bboxStmt.executeUpdate(psql);
        psql = "CREATE EXTENSION if not exists postgis_topology;";
        bboxStmt.executeUpdate(psql);

        // get layer object
        Layer l = c.getLayers().get(layerId);
        Transform trans = l.getTransform();

        // step 0: create tables for storing upgrouped grids
        String ungroupedTableName = "bbox_ungrouped_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;
        // drop table if exists
        String sql = "drop table if exists " + ungroupedTableName + ";";
        bboxStmt.executeUpdate(sql);
        // create the bbox table
        sql = "create table " + ungroupedTableName + " (grid_x int, grid_y int, compressed_blob text, "
                + "minx double precision, miny double precision, "
                + "maxx double precision, maxy double precision);";
        bboxStmt.executeUpdate(sql);

        // if this is an empty layer, continue
        if (trans.getDb().equals(""))
            return ;

        // step 1: set up nashorn environment, prepared statement, column name to id mapping
        NashornScriptEngine engine = null;
        if (! trans.getTransformFunc().equals(""))
            engine = setupNashorn(trans.getTransformFunc());

        // step 2: looping through query results
        // TODO: distinguish between separable and non-separable cases

        // prepared statements
        String insertSql = "insert into " + ungroupedTableName + " values (?, ?, ?, ?, ?, ?, ?);";
        PreparedStatement insPrepStmt = dbConn.prepareStatement(insertSql);

        // in-memory structures to maintain for each batch of records
        HashMap<String, StringBuilder> blobs = new HashMap<>();
        HashMap<String, Box> boxes = new HashMap<>();

        // fetch query result
        ResultSet rs = DbConnector.getQueryResultIterator(trans.getDb(), trans.getQuery());
        int rowCount = 0, insCount;
        int numColumn = rs.getMetaData().getColumnCount();
        long st = System.currentTimeMillis();
        long lastBatchSt = st;
        System.out.println("\nConstructing ungrouped table...");
        while (true) {

            // count log
            boolean hasNext = rs.next();
            rowCount ++;

            // flush stuff in blobs and boxes to the database
            if (rowCount % batchSize == 0 || ! hasNext) {
                System.out.println("In-memory processing for this batch: " + (System.currentTimeMillis() - lastBatchSt) / 1000.0 + "s.");
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
                    insPrepStmt.setDouble(4, curBbox.getMinx()); insPrepStmt.setDouble(5, curBbox.getMiny());
                    insPrepStmt.setDouble(6, curBbox.getMaxx()); insPrepStmt.setDouble(7, curBbox.getMaxy());
                    insPrepStmt.addBatch();
                    insCount ++;
                    if (insCount % updBatchSize == 0) {
//                            long insSt = System.currentTimeMillis();
                        insPrepStmt.executeBatch();
//                            System.out.println("Insert: " + (System.currentTimeMillis() - insSt) / 1000.0 + ".s");
                    }
                }
                System.out.println("Insertion count: " + insCount);
                insPrepStmt.executeBatch();
                DbConnector.commitConnection(Config.databaseName);
                blobs.clear();
                boxes.clear();
                lastBatchSt = System.currentTimeMillis();
            }
            if (! hasNext)
                break;

            // get raw row
            ArrayList<String> curRawRow = new ArrayList<>();
            for (int i = 1; i <= numColumn; i ++)
                curRawRow.add(rs.getString(i));

            // step 3: run transform function on this tuple
            ArrayList<String> transformedRow;
            if (! trans.getTransformFunc().equals(""))
                transformedRow = getTransformedRow(c, curRawRow, engine);
            else
                transformedRow = curRawRow;

            // step 4: calculate bounding boxes
            ArrayList<Double> bbox = getBboxCoordinates(c, l, transformedRow);
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
            if (! blobs.containsKey(gridKey))
                blobs.put(gridKey, new StringBuilder());
            StringBuilder curBlob = blobs.get(gridKey);
            if (curBlob.length() > 0)
                curBlob.append("__");
            curBlob.append(transformedRow.get(0));
            for (int i = 1; i < transformedRow.size(); i ++)
                curBlob.append("**" + transformedRow.get(i));
            for (int i = 0; i < bbox.size(); i ++)
                curBlob.append("**" + String.valueOf(bbox.get(i)));

            // update bounding box
            if (! boxes.containsKey(gridKey))
                boxes.put(gridKey, new Box(minx, miny, maxx, maxy));
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
        DbConnector.closeConnection(trans.getDb());
        insPrepStmt.close();
        System.out.println("Constructing ungrouped table: " + (System.currentTimeMillis() - st) / 1000.0 + "s.");

        // create another table storing grouped grids
        st = System.currentTimeMillis();
        String groupedTableName = "bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;
        // drop table if exists
        sql = "drop table if exists " + groupedTableName + ";";
        bboxStmt.executeUpdate(sql);
        // create the bbox table
        sql = "create table " + groupedTableName + " (grid_x int, grid_y int, compressed_blob text, "
                + "minx double precision, miny double precision, "
                + "maxx double precision, maxy double precision, geom geometry(polygon));";
        bboxStmt.executeUpdate(sql);

        // prepared statements
        insertSql = "insert into " + groupedTableName + " values (?, ?, ?, ?, ?, ?, ?, ST_GeomFromText(?));";
        insPrepStmt = dbConn.prepareStatement(insertSql);

        // info of current group
        int curGridX = -1, curGridY = -1;
        double curMinX = -1, curMinY = -1, curMaxX = -1, curMaxY = -1;
        StringBuilder curBlob = new StringBuilder();

        // read from upgrouped table and construct the grouped table
        sql = "select * from " + ungroupedTableName + " order by grid_x asc, grid_y asc;";
        rs = DbConnector.getQueryResultIterator(Config.databaseName, sql);
        rowCount = insCount = 0;
        System.out.println("\nConstructing grouped table...");
        while (rs.next()) {
            rowCount ++;
            if (rowCount % 1000000 == 0)
                System.out.println(rowCount);
            int gridX = rs.getInt(1);
            int gridY = rs.getInt(2);
            if (gridX != curGridX || gridY != curGridY) {
                // insert the last one
                if (curGridX != -1) {
                    insPrepStmt.setInt(1, curGridX);
                    insPrepStmt.setInt(2, curGridY);
                    insPrepStmt.setString(3, curBlob.toString());
                    insPrepStmt.setDouble(4, curMinX); insPrepStmt.setDouble(5, curMinY);
                    insPrepStmt.setDouble(6, curMaxX); insPrepStmt.setDouble(7, curMaxY);
                    insPrepStmt.setString(8, getPolygonText(curMinX, curMinY, curMaxX, curMaxY));
                    insPrepStmt.addBatch();
                    insCount ++;
                    if (insCount % updBatchSize == 0)
                        insPrepStmt.executeBatch();
                }
                curGridX = gridX; curGridY = gridY;
                curMinX = rs.getDouble(4); curMinY = rs.getDouble(5);
                curMaxX = rs.getDouble(6); curMaxY = rs.getDouble(7);
                curBlob = new StringBuilder(rs.getString(3));
            }
            else {
                // merge
                curBlob.append("_");
                curBlob.append(rs.getString(3));
                curMinX = Math.min(curMinX, rs.getDouble(4));
                curMinY = Math.min(curMinY, rs.getDouble(5));
                curMaxX = Math.min(curMaxX, rs.getDouble(6));
                curMaxY = Math.min(curMaxY, rs.getDouble(7));
            }
        }
        rs.close();
        insPrepStmt.executeBatch();
        DbConnector.commitConnection(Config.databaseName);
        insPrepStmt.close();
        System.out.println("Constructing grouped table: " + (System.currentTimeMillis() - st) / 1000.0 + "s.");

        // create index
        st = System.currentTimeMillis();
        sql = "create index sp_" + groupedTableName + " on " + groupedTableName + " using gist (geom);";
        bboxStmt.executeUpdate(sql);
        sql = "cluster " + groupedTableName + " using sp_" + groupedTableName + ";";
        bboxStmt.executeUpdate(sql);
        DbConnector.commitConnection(Config.databaseName);
        System.out.println("Indexing: " + (System.currentTimeMillis() - st) / 1000.0 + "s.");
        System.out.println();
        bboxStmt.close();
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromRegion(Canvas c, int layerId, String regionWKT, String predicate) throws Exception {
        return null;
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromTile(Canvas c, int layerId, int minx, int miny, String predicate) throws Exception {
        return null;
    }
}
