package index;

import main.Config;
import main.DbConnector;
import main.Main;
import project.AutoDD;
import project.Canvas;

import java.sql.*;
import java.util.ArrayList;

/**
 * Created by wenbo on 4/15/19.
 */
public class AutoDDIndexer extends PsqlSpatialIndexer {

    private static AutoDDIndexer instance = null;
    private static int virtualViewportSize = 100;
    private static int densityUpperBound = 5;
    private double overlappingThreshold = 0.5; //TODO: formalize this overlapping parameter

    // singleton pattern to ensure only one instance existed
    private AutoDDIndexer() {}

    // thread-safe instance getter
    public static synchronized AutoDDIndexer getInstance() {

        if (instance == null)
            instance = new AutoDDIndexer();
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

        // create tables
        Statement bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);

        // create postgis extension if not existed
        String psql = "CREATE EXTENSION if not exists postgis;";
        bboxStmt.executeUpdate(psql);
        psql = "CREATE EXTENSION if not exists postgis_topology;";
        bboxStmt.executeUpdate(psql);

        for (int i = 0; i < autoDD.getNumLevels(); i ++) {
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

            // create index
            sql = "create index sp_" + bboxTableName + " on " + bboxTableName + " using gist (geom);";
            bboxStmt.executeUpdate(sql);
            sql = "cluster " + bboxTableName + " using sp_" + bboxTableName + ";";
            bboxStmt.executeUpdate(sql);
        }
        bboxStmt.close();

        // do indexing for each level
        for (int i = 0; i < autoDD.getNumLevels(); i ++)
            createMVForLevel(i, autoDDIndex);

        DbConnector.closeConnection(Config.databaseName);
    }

    private void createMVForLevel(int level, int autoDDIndex) throws SQLException, ClassNotFoundException {

        System.out.println("Algorithm: direct density check...");

        AutoDD autoDD = Main.getProject().getAutoDDs().get(autoDDIndex);
        Connection dbConn = DbConnector.getDbConn(Config.dbServer, Config.databaseName, Config.userName, Config.password);
        double zoomFactor = autoDD.getZoomFactor();
        int numLevels = autoDD.getNumLevels();

/*        if (level == 0) // Hardcode for twitter app
            densityUpperBound = 15;
        else
            densityUpperBound = 6; */

        // set up query iterator
        Statement rawDBStmt = DbConnector.getStmtByDbName(autoDD.getDb());
        ResultSet rs = DbConnector.getQueryResultIterator(rawDBStmt, autoDD.getQuery());

        // Prepared statements for each level below
        ArrayList<PreparedStatement> preparedStmts = new ArrayList<>();
        for (int i = 0; i < numLevels; i ++) {
            String bboxTableName = getAutoDDBboxTableName(autoDDIndex, i);
            String insertSql = "insert into " + bboxTableName + " values (";
            for (int j = 0; j < autoDD.getColumnNames().size() + 6; j ++)
                insertSql += "?, ";
            insertSql += "ST_GeomFromText(?));";
            PreparedStatement preparedStmt = dbConn.prepareStatement(insertSql);
            preparedStmts.add(preparedStmt);
        }

        // loop through raw query results, sample one by one.
        int rowCount = 0;
        int numColumn = rs.getMetaData().getColumnCount();
        while (rs.next()) {

            // count log
            rowCount ++;
            if (rowCount % 1000 == 0)
                System.out.println(level + " : " + rowCount);

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
            String bigBoxPolygonText = getPolygonText(cx - virtualViewportSize, cy - virtualViewportSize,
                    cx + virtualViewportSize, cy + virtualViewportSize);

            // find objects close enough to the current new object
            String sql = "select cx, cy from " + getAutoDDBboxTableName(autoDDIndex, level)
                    + " where st_intersects(st_GeomFromText('" + bigBoxPolygonText + "'), geom);";
            ArrayList<ArrayList<String>> closeObjects = DbConnector.getQueryResult(Config.databaseName, sql);
            boolean isAddingCurNewObject = true;

            // check overlap
            for (int i = 0; i < closeObjects.size(); i ++) {
                double curCx = Double.valueOf(closeObjects.get(i).get(0));
                double curCy = Double.valueOf(closeObjects.get(i).get(1));
                if (Math.abs(curCx - cx) / (double) autoDD.getBboxW() < overlappingThreshold &&
                        Math.abs(curCy - cy) / (double) autoDD.getBboxH() < overlappingThreshold) {
                    isAddingCurNewObject = false;
                    break;
                }
            }
            if (! isAddingCurNewObject)
                continue;

            // check density: O(C^3) TODO: improve it to O(C^2 log C)
            for (int i = 0; i < closeObjects.size(); i ++) {
                for (int j = 0; j < closeObjects.size(); j ++) {
                    if (i == j)
                        continue;
                    double curMinx = Double.valueOf(closeObjects.get(i).get(0));
                    double curMiny = Double.valueOf(closeObjects.get(j).get(1));
                    double curMaxx = curMinx + virtualViewportSize;
                    double curMaxy = curMiny + virtualViewportSize;
                    int density = 0;
                    for (int k = 0; k < closeObjects.size(); k ++) {
                        double curCx = Double.valueOf(closeObjects.get(k).get(0));
                        double curCy = Double.valueOf(closeObjects.get(k).get(1));
                        if (curMinx <= curCx && curCx <= curMaxx && curMiny <= curCy && curCy <= curMaxy)
                            density ++;
                    }
                    if (curMinx <= cx && cx <= curMaxx && curMiny <= cy && cy <= curMaxy)
                        density ++;
                    if (density > densityUpperBound) {
                        isAddingCurNewObject = false;
                        break;
                    }
                }
                if (! isAddingCurNewObject)
                    break;
            }
            if (! isAddingCurNewObject)
                continue;

            // sample this object, insert to all levels below this level
            for (int i = level; i < numLevels; i ++) {
                PreparedStatement preparedStmt = preparedStmts.get(i);
                // insert into bbox table
                for (int j = 0; j < curRawRow.size(); j ++)
                    preparedStmt.setString(j + 1, curRawRow.get(j).replaceAll("\'", "\'\'"));
                preparedStmt.setDouble(curRawRow.size() + 1, cx);
                preparedStmt.setDouble(curRawRow.size() + 2, cy);
                preparedStmt.setDouble(curRawRow.size() + 3, minx);
                preparedStmt.setDouble(curRawRow.size() + 4, miny);
                preparedStmt.setDouble(curRawRow.size() + 5, maxx);
                preparedStmt.setDouble(curRawRow.size() + 6, maxy);
                preparedStmt.setString(curRawRow.size() + 7,
                        getPolygonText(minx, miny, maxx, maxy));
                preparedStmt.addBatch();
                cx *= zoomFactor; cy *= zoomFactor;
                minx = cx - autoDD.getBboxW() / 2;
                miny = cy - autoDD.getBboxH() / 2;
                maxx = cx + autoDD.getBboxW() / 2;
                maxy = cy + autoDD.getBboxH() / 2;
            }
            // TODO: batch insert
            for (int i = level; i < numLevels; i ++)
                preparedStmts.get(i).executeBatch();
        }
        rs.close();
        rawDBStmt.close();
        DbConnector.closeConnection(autoDD.getDb());
        for (int i = 0; i < numLevels; i ++)
            preparedStmts.get(i).close();
    }

    private String getAutoDDBboxTableName(int autoDDIndex, int level) {

        return "bbox_" + Main.getProject().getName() + "_autodd" + autoDDIndex + "_level" + level + "layer0";
    }
}
