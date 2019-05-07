package index;

import main.Config;
import main.DbConnector;
import main.Main;
import project.AutoDD;
import project.Canvas;

import java.sql.*;
import java.util.ArrayList;

/**
 * Created by wenbo on 5/6/19.
 */
public class AutoDDInMemoryIndexer extends PsqlSpatialIndexer {

    private static AutoDDInMemoryIndexer instance = null;
    private double overlappingThreshold = 1.1;
    private ArrayList<ArrayList<ArrayList<String>>> samples;

    // singleton pattern to ensure only one instance existed
    private AutoDDInMemoryIndexer() {}

    // thread-safe instance getter
    public static synchronized AutoDDInMemoryIndexer getInstance() {

        if (instance == null)
            instance = new AutoDDInMemoryIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        // create MV for all layers at once
        int curLevel = Integer.valueOf(c.getId().substring(c.getId().indexOf("level") + 5));
        if (curLevel > 0)
            return ;

        // get current AutoDD object
        int autoDDIndex = Integer.valueOf(c.getId().substring(6, c.getId().indexOf("_")));
        AutoDD autoDD = Main.getProject().getAutoDDs().get(autoDDIndex);
        int numLevels = autoDD.getNumLevels();

        // sample for each level
        samples = new ArrayList<>();
        for (int i = 0; i < numLevels; i ++)
            samples.add(new ArrayList<>());
        for (int i = 0; i < numLevels; i ++)
            createMVForLevel(i, autoDDIndex);

        // create tables
        Statement bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String psql = "CREATE EXTENSION if not exists postgis;";
        bboxStmt.executeUpdate(psql);
        psql = "CREATE EXTENSION if not exists postgis_topology;";
        bboxStmt.executeUpdate(psql);
        for (int i = 0; i < numLevels; i ++) {
            // step 0: create tables for storing bboxes
            String bboxTableName = getAutoDDBboxTableName(autoDDIndex, i);

            // drop table if exists
            String sql = "drop table if exists " + bboxTableName + ";";
            bboxStmt.executeUpdate(sql);

            // create the bbox table
            sql = "create table " + bboxTableName + " (";
            for (int j = 0; j < autoDD.getColumnNames().size(); j ++)
                sql += autoDD.getColumnNames().get(j) + " text, ";
            sql += "cx double precision, cy double precision, minx double precision, miny double precision, " +
                    "maxx double precision, maxy double precision, geom geometry(polygon));";
            bboxStmt.executeUpdate(sql);
        }

        // insert samples
        Connection dbConn = DbConnector.getDbConn(Config.dbServer, Config.databaseName, Config.userName, Config.password);
        for (int i = 0; i < numLevels; i ++) {

            String bboxTableName = getAutoDDBboxTableName(autoDDIndex, i);
            String insertSql = "insert into " + bboxTableName + " values (";
            for (int j = 0; j < autoDD.getColumnNames().size() + 6; j ++)
                insertSql += "?, ";
            insertSql += "ST_GeomFromText(?));";
            PreparedStatement preparedStmt = dbConn.prepareStatement(insertSql);
            ArrayList<ArrayList<String>> curSamples = samples.get(i);
            for (int j = 0; j < curSamples.size(); j ++) {
                ArrayList<String> curSample = curSamples.get(j);

                // raw data fields
                for (int k = 0; k < curSample.size() - 6; k ++)
                    preparedStmt.setString(k + 1, curSample.get(k).replaceAll("\'", "\'\'"));

                // bounding box fields
                double cx = Double.valueOf(curSample.get(curSample.size() - 6));
                double cy = Double.valueOf(curSample.get(curSample.size() - 5));
                double minx = Double.valueOf(curSample.get(curSample.size() - 4));
                double miny = Double.valueOf(curSample.get(curSample.size() - 3));
                double maxx = Double.valueOf(curSample.get(curSample.size() - 2));
                double maxy = Double.valueOf(curSample.get(curSample.size() - 1));
                preparedStmt.setDouble(curSample.size() - 5, cx);
                preparedStmt.setDouble(curSample.size() - 4, cy);
                preparedStmt.setDouble(curSample.size() - 3, minx);
                preparedStmt.setDouble(curSample.size() - 2, miny);
                preparedStmt.setDouble(curSample.size() - 1, maxx);
                preparedStmt.setDouble(curSample.size(), maxy);
                preparedStmt.setString(curSample.size() + 1,
                        getPolygonText(minx, miny, maxx, maxy));
                preparedStmt.addBatch();

                // batch commit
                if ((j + 1) % Config.bboxBatchSize == 0) {
                    preparedStmt.executeBatch();
                    DbConnector.commitConnection(Config.databaseName);
                }
            }
            preparedStmt.executeBatch();
            DbConnector.commitConnection(Config.databaseName);
            preparedStmt.close();

            // build spatial index
            String sql = "create index sp_" + bboxTableName + " on " + bboxTableName + " using gist (geom);";
            bboxStmt.executeUpdate(sql);
            sql = "cluster " + bboxTableName + " using sp_" + bboxTableName + ";";
            bboxStmt.executeUpdate(sql);

        }

        // commit & close connections
        bboxStmt.close();
        DbConnector.commitConnection(Config.databaseName);
        DbConnector.closeConnection(Config.databaseName);
    }

    private void createMVForLevel(int level, int autoDDIndex) throws SQLException, ClassNotFoundException {

        System.out.println("Sampling for level " + level + "...");

        AutoDD autoDD = Main.getProject().getAutoDDs().get(autoDDIndex);
        int numLevels = autoDD.getNumLevels();
        double zoomFactor = autoDD.getZoomFactor();

        // set up query iterator
        Statement rawDBStmt = DbConnector.getStmtByDbName(autoDD.getDb());
        ResultSet rs = DbConnector.getQueryResultIterator(rawDBStmt, autoDD.getQuery());

        // loop through raw query results, sample one by one.
        int numColumn = rs.getMetaData().getColumnCount();
        while (rs.next()) {

            // get raw row
            ArrayList<String> curRawRow = new ArrayList<>();
            for (int i = 1; i <= numColumn; i ++)
                curRawRow.add(rs.getString(i));

            // get bbox info for this tuple
            double cx = autoDD.getCanvasCoordinate(level, rs.getDouble(autoDD.getXColId() + 1), true);
            double cy = autoDD.getCanvasCoordinate(level, rs.getDouble(autoDD.getYColId() + 1), false);
            double minx = cx - autoDD.getBboxW() / 2;
            double miny = cy - autoDD.getBboxH() / 2;
            double maxx = cx + autoDD.getBboxW() / 2;
            double maxy = cy + autoDD.getBboxH() / 2;

            // check overlap  TODO: use in memory R-tree
            boolean isAddingCurNewObject = true;
            ArrayList<ArrayList<String>> curSamples = samples.get(level);
            for (int i = 0; i < curSamples.size(); i ++) {
                double curCx = Double.valueOf(curSamples.get(i).get(numColumn));
                double curCy = Double.valueOf(curSamples.get(i).get(numColumn + 1));
                if (Math.abs(curCx - cx) / (double) autoDD.getBboxW() < overlappingThreshold &&
                        Math.abs(curCy - cy) / (double) autoDD.getBboxH() < overlappingThreshold) {
                    isAddingCurNewObject = false;
                    break;
                }
            }
            if (! isAddingCurNewObject)
                continue;

            // sample this object, insert to all levels below this level
            for (int i = level; i < numLevels; i ++) {
                ArrayList<String> curRow = new ArrayList<>(curRawRow);
                curRow.add(String.valueOf(cx)); curRow.add(String.valueOf(cy));
                curRow.add(String.valueOf(minx)); curRow.add(String.valueOf(miny));
                curRow.add(String.valueOf(maxx)); curRow.add(String.valueOf(maxy));
                samples.get(i).add(curRow);
                cx *= zoomFactor; cy *= zoomFactor;
                minx = cx - autoDD.getBboxW() / 2;
                miny = cy - autoDD.getBboxH() / 2;
                maxx = cx + autoDD.getBboxW() / 2;
                maxy = cy + autoDD.getBboxH() / 2;
            }
        }
        rs.close();
        rawDBStmt.close();
        DbConnector.closeConnection(autoDD.getDb());
    }

    private String getAutoDDBboxTableName(int autoDDIndex, int level) {

        return "bbox_" + Main.getProject().getName() + "_autodd" + autoDDIndex + "_level" + level + "layer0";
    }
}
