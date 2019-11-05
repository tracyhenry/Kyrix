package index;

import box.Box;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import main.Config;
import main.DbConnector;
import main.Main;
import project.AutoDD;
import project.Canvas;

/** Created by wenbo on 11/1/19. */
public class AutoDDCitusIndexer extends BoundingBoxIndexer {

    private static AutoDDCitusIndexer instance = null;
    private final int objectNumLimit = 4000; // in a 1k by 1k region
    private final int virtualViewportSize = 1000;
    private double overlappingThreshold = 1.0;
    private final String aggKeyDelimiter = "__";
    private String curAutoDDId; // autoddIndex + "_0"
    private int curAutoDDIndex, numLevels, numRawColumns;
    private AutoDD autoDD;
    private Statement kyrixStmt;
    private long st;

    // singleton pattern to ensure only one instance existed
    private AutoDDCitusIndexer() {}

    // thread-safe instance getter
    public static synchronized AutoDDCitusIndexer getInstance() {

        if (instance == null) instance = new AutoDDCitusIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        // create MV for all autoDD layers at once
        curAutoDDId = c.getLayers().get(layerId).getAutoDDId();
        if (!curAutoDDId.substring(curAutoDDId.indexOf("_") + 1).equals("0")) return;

        // set some commonly accessed variables, such as autoDD, numLevels, numRawColumns, etc.
        setCommonVariables();

        // create a distributed table raw_magnified_rr, distributed with random hash_keys
        // RR stands for round robin
        createRawMagnifiedRRTable();
    }

    private void setCommonVariables() throws SQLException, ClassNotFoundException {
        // get current AutoDD object
        curAutoDDIndex = Integer.valueOf(curAutoDDId.substring(0, curAutoDDId.indexOf("_")));
        autoDD = Main.getProject().getAutoDDs().get(curAutoDDIndex);

        // number of levels
        numLevels = autoDD.getNumLevels();

        // number of raw fields
        numRawColumns = autoDD.getColumnNames().size();

        // calculate overlapping threshold
        overlappingThreshold =
                Math.max(
                        0.2,
                        Math.sqrt(
                                4
                                        * (virtualViewportSize + autoDD.getBboxW() * 2)
                                        * (virtualViewportSize + autoDD.getBboxH() * 2)
                                        / objectNumLimit
                                        / autoDD.getBboxH()
                                        / autoDD.getBboxW()));
        if (!autoDD.getOverlap()) overlappingThreshold = Math.max(overlappingThreshold, 1);

        // DB statement
        kyrixStmt = DbConnector.getStmtByDbName(Config.databaseName);
    }

    private void createRawMagnifiedRRTable() throws SQLException {

        // get the list of fields that are not x or y
        ArrayList<String> nonXYCols = new ArrayList<>();
        for (int i = 0; i < autoDD.getColumnNames().size(); i++) {
            String curCol = autoDD.getColumnNames().get(i);
            if (curCol.equals(autoDD.getxCol()) || curCol.equals(autoDD.getyCol())) continue;
            nonXYCols.add(curCol);
        }

        // create table
        String sql = "CREATE TABLE raw_magnified_rr (";
        for (int i = 0; i < nonXYCols.size(); i++) sql += nonXYCols.get(i) + " text, ";
        sql += "x double, y double, hash_key int, sp_key int, centroid point;";
        System.out.println(sql);
        kyrixStmt.executeUpdate(sql);

        // distribute the table
        sql = "SELECT create_distributed_table('raw_magnified_rr', 'hash_key');";
        System.out.println(sql);
        kyrixStmt.executeUpdate(sql);

        // magnification, 2^20 should be good enough
        double magnification = Math.pow(2, 20);

        // set the extent of x & y if not specified
        autoDD.setXYExtent();

        // insert query for populating raw_magnified_rr
        sql = "INSERT INTO raw_magnified_rr (";
        for (int i = 0; i < nonXYCols.size(); i++) sql += nonXYCols.get(i) + ", ";
        sql += "hash_key) SELECT ";
        for (int i = 0; i < nonXYCols.size(); i++) sql += nonXYCols.get(i) + ", ";
        sql += "(random()*2147483648*2.0 - 2147483648)::int ";
        sql += "FROM (" + autoDD.getQuery() + ") rawquery;";
        System.out.println(sql);
        st = System.nanoTime();
        kyrixStmt.executeUpdate(sql);
        System.out.println(
                "Populating raw_magnified_rr took: " + (System.nanoTime() - st) / 1e9 + "s.");

        // TODO: test which is faster, insert from a distributed table or a local table.
        // use UPDATE for populating the x, y, centroid fields
        // has to use UPDATE because it's faster and easier
        // need to tune Postgres to avoid autovacuum shit

        // (topLevelWidth - bboxW) * (v - loX) / (hiX - loX) + bboxW / 2.0
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromRegion(
            Canvas c, int layerId, String regionWKT, String predicate, Box newBox, Box oldBox)
            throws Exception {
        return null;
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromTile(
            Canvas c, int layerId, int minx, int miny, String predicate) throws Exception {
        return null;
    }
}
