package index;

import main.Config;
import main.DbConnector;
import main.Main;
import project.AutoDD;
import project.Canvas;
import project.Layer;

import java.sql.*;
import java.util.ArrayList;

/**
 * Created by wenbo on 4/1/19.
 */
public class AutoDDIndexer extends PsqlSpatialIndexer {

    private static AutoDDIndexer instance = null;

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

        // create postgis extension if not existed
        String psql = "CREATE EXTENSION if not exists postgis;";
        bboxStmt.executeUpdate(psql);
        psql = "CREATE EXTENSION if not exists postgis_topology;";
        bboxStmt.executeUpdate(psql);

        // commit & close connections
        DbConnector.commitConnection(Config.databaseName);
        bboxStmt.close();

        // do indexing for each level
        for (int i = 0; i < autoDD.getNumLevels(); i ++)
            createMVForLevel(i, autoDDIndex);
    }

    private void createMVForLevel(int level, int autoDDIndex) throws SQLException, ClassNotFoundException {

        AutoDD autoDD = Main.getProject().getAutoDDs().get(autoDDIndex);
        Connection dbConn = DbConnector.getDbConn(Config.dbServer, Config.databaseName, Config.userName, Config.password);
        double zoomFactor = autoDD.getZoomFactor();
        int numLevels = autoDD.getNumLevels();

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
            if (rowCount % 1000000 == 0)
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
            String polygonText = getPolygonText(minx, miny, maxx, maxy);

            // check D constraint
            String sql = "select ST_Distance(st_GeomFromText('" + polygonText + "'), geom) from " + getAutoDDBboxTableName(autoDDIndex, level)
                    + " order by geom <-> st_GeomFromText('" + polygonText + "') limit 1;";
            ArrayList<ArrayList<String>> disResult = DbConnector.getQueryResult(Config.databaseName, sql);
            if (! disResult.isEmpty()) {
                double dis = Double.valueOf(disResult.get(0).get(0));
                if (dis <= Config.autoDDDConstraintDValue)
                    continue;
            }

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
            DbConnector.commitConnection(Config.databaseName);
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
