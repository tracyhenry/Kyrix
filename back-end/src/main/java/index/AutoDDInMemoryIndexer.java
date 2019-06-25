package index;

import com.github.davidmoten.rtree.Entry;
import com.github.davidmoten.rtree.RTree;
import com.github.davidmoten.rtree.geometry.Geometries;
import com.github.davidmoten.rtree.geometry.Rectangle;
import java.sql.*;
import java.util.ArrayList;
import main.Config;
import main.DbConnector;
import main.Main;
import project.AutoDD;
import project.Canvas;

/** Created by wenbo on 5/6/19. */
public class AutoDDInMemoryIndexer extends PsqlSpatialIndexer {

    private static AutoDDInMemoryIndexer instance = null;
    private final int objectNumLimit = 2000; // in a 1k by 1k region
    private double overlappingThreshold = 1.0;

    // One Rtree per level to store samples
    // https://github.com/davidmoten/rtree
    private ArrayList<RTree<ArrayList<String>, Rectangle>> Rtrees;
    private ArrayList<ArrayList<String>> rawRows;

    // singleton pattern to ensure only one instance existed
    private AutoDDInMemoryIndexer() {}

    // thread-safe instance getter
    public static synchronized AutoDDInMemoryIndexer getInstance() {

        if (instance == null) instance = new AutoDDInMemoryIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        // create MV for all autoDD layers at once
        int curLevel = Integer.valueOf(c.getId().substring(c.getId().indexOf("level") + 5));
        if (curLevel > 0) return;

        // get current AutoDD object
        int autoDDIndex = Integer.valueOf(c.getId().substring(6, c.getId().indexOf("_")));
        AutoDD autoDD = Main.getProject().getAutoDDs().get(autoDDIndex);
        int numLevels = autoDD.getNumLevels();
        int numRawColumns = autoDD.getColumnNames().size();

        // calculate overlapping threshold
        overlappingThreshold =
                Math.max(
                        0.5,
                        Math.sqrt(4e6 / objectNumLimit / autoDD.getBboxH() / autoDD.getBboxW())
                                - 1);
        if (!autoDD.getOverlap()) overlappingThreshold = Math.max(overlappingThreshold, 1);
        System.out.println("Overlapping threshold: " + overlappingThreshold);

        // store raw query results into memory
        rawRows = DbConnector.getQueryResult(autoDD.getDb(), autoDD.getQuery());

        // sample for each level
        Rtrees = new ArrayList<>();
        for (int i = 0; i < numLevels; i++) Rtrees.add(RTree.create());
        for (int i = 0; i < numLevels; i++) createMVForLevel(i, autoDDIndex);

        // compute cluster number
        if (autoDD.getRenderingMode().equals("object+clusternum")
                || autoDD.getRenderingMode().equals("circle only")
                || autoDD.getRenderingMode().equals("circle+object")) {

            // a fake bottom level for non-sampled objects
            Rtrees.add(RTree.create());
            for (ArrayList<String> rawRow : rawRows) {
                ArrayList<String> bboxRow = new ArrayList<>();
                for (int i = 0; i < rawRow.size(); i++) bboxRow.add(rawRow.get(i));
                bboxRow.add("0");
                Rtrees.set(
                        numLevels,
                        Rtrees.get(numLevels).add(bboxRow, Geometries.rectangle(0, 0, 0, 0)));
            }

            for (int i = numLevels; i > 0; i--) {
                Iterable<Entry<ArrayList<String>, Rectangle>> curSamples =
                        Rtrees.get(i).entries().toBlocking().toIterable();
                for (Entry<ArrayList<String>, Rectangle> o : curSamples) {
                    ArrayList<String> curRow = o.value();
                    // boundary case: bottom level
                    if (i == numLevels) curRow.set(numRawColumns, "1");

                    // find its nearest neighbor in one level up
                    // using binary search + Rtree
                    double minDistance = Double.MAX_VALUE;
                    ArrayList<String> nearestNeighbor = null;
                    double cx =
                            autoDD.getCanvasCoordinate(
                                    i - 1, Double.valueOf(curRow.get(autoDD.getXColId())), true);
                    double cy =
                            autoDD.getCanvasCoordinate(
                                    i - 1, Double.valueOf(curRow.get(autoDD.getYColId())), false);
                    double minx = cx - autoDD.getBboxW() * overlappingThreshold / 2;
                    double miny = cy - autoDD.getBboxH() * overlappingThreshold / 2;
                    double maxx = cx + autoDD.getBboxW() * overlappingThreshold / 2;
                    double maxy = cy + autoDD.getBboxH() * overlappingThreshold / 2;
                    Iterable<Entry<ArrayList<String>, Rectangle>> neighbors =
                            Rtrees.get(i - 1)
                                    .search(Geometries.rectangle(minx, miny, maxx, maxy))
                                    .toBlocking()
                                    .toIterable();
                    for (Entry<ArrayList<String>, Rectangle> nb : neighbors) {
                        ArrayList<String> curNeighbor = nb.value();
                        double curCx =
                                autoDD.getCanvasCoordinate(
                                        i - 1,
                                        Double.valueOf(curNeighbor.get(autoDD.getXColId())),
                                        true);
                        double curCy =
                                autoDD.getCanvasCoordinate(
                                        i - 1,
                                        Double.valueOf(curNeighbor.get(autoDD.getYColId())),
                                        false);
                        double curDistance =
                                (cx - curCx) * (cx - curCx) + (cy - curCy) * (cy - curCy);
                        if (curDistance < minDistance) {
                            minDistance = curDistance;
                            nearestNeighbor = curNeighbor;
                        }
                    }

                    // increment the cluster number of the NN
                    int clusterNumBeforeIncrement =
                            Integer.valueOf(nearestNeighbor.get(numRawColumns));
                    int clusterNumAfterIncrement =
                            clusterNumBeforeIncrement + Integer.valueOf(curRow.get(numRawColumns));
                    nearestNeighbor.set(numRawColumns, String.valueOf(clusterNumAfterIncrement));
                }
            }
        }

        // create tables
        Statement bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String psql = "CREATE EXTENSION if not exists postgis;";
        bboxStmt.executeUpdate(psql);
        psql = "CREATE EXTENSION if not exists postgis_topology;";
        bboxStmt.executeUpdate(psql);
        for (int i = 0; i < numLevels; i++) {
            // step 0: create tables for storing bboxes
            String bboxTableName = getAutoDDBboxTableName(autoDDIndex, i);

            // drop table if exists
            String sql = "drop table if exists " + bboxTableName + ";";
            bboxStmt.executeUpdate(sql);

            // create the bbox table
            sql = "create table " + bboxTableName + " (";
            for (int j = 0; j < autoDD.getColumnNames().size(); j++)
                sql += autoDD.getColumnNames().get(j) + " text, ";
            sql +=
                    "cluster_num int, cx double precision, cy double precision, minx double precision, miny double precision, "
                            + "maxx double precision, maxy double precision, geom geometry(polygon));";
            bboxStmt.executeUpdate(sql);
        }

        // insert samples
        for (int i = 0; i < numLevels; i++) {

            String bboxTableName = getAutoDDBboxTableName(autoDDIndex, i);
            String insertSql = "insert into " + bboxTableName + " values (";
            for (int j = 0; j < numRawColumns + 7; j++) insertSql += "?, ";
            insertSql += "ST_GeomFromText(?));";
            PreparedStatement preparedStmt =
                    DbConnector.getPreparedStatement(Config.databaseName, insertSql);
            int insertCount = 0;
            Iterable<Entry<ArrayList<String>, Rectangle>> samples =
                    Rtrees.get(i).entries().toBlocking().toIterable();
            for (Entry<ArrayList<String>, Rectangle> o : samples) {
                ArrayList<String> curRow = o.value();

                // raw data fields
                for (int k = 0; k < numRawColumns; k++)
                    preparedStmt.setString(k + 1, curRow.get(k).replaceAll("\'", "\'\'"));

                // cluster_num & bounding box fields
                for (int k = 0; k <= 6; k++)
                    preparedStmt.setDouble(
                            numRawColumns + k + 1, Double.valueOf(curRow.get(numRawColumns + k)));
                double minx = Double.valueOf(curRow.get(numRawColumns + 3));
                double miny = Double.valueOf(curRow.get(numRawColumns + 4));
                double maxx = Double.valueOf(curRow.get(numRawColumns + 5));
                double maxy = Double.valueOf(curRow.get(numRawColumns + 6));
                preparedStmt.setString(numRawColumns + 8, getPolygonText(minx, miny, maxx, maxy));

                // batch commit
                preparedStmt.addBatch();
                insertCount++;
                if ((insertCount + 1) % Config.bboxBatchSize == 0) preparedStmt.executeBatch();
            }
            preparedStmt.executeBatch();
            preparedStmt.close();

            // build spatial index
            String sql =
                    "create index sp_"
                            + bboxTableName
                            + " on "
                            + bboxTableName
                            + " using gist (geom);";
            bboxStmt.executeUpdate(sql);
            sql = "cluster " + bboxTableName + " using sp_" + bboxTableName + ";";
            bboxStmt.executeUpdate(sql);
        }

        // commit & close connections
        bboxStmt.close();
        DbConnector.closeConnection(Config.databaseName);

        // release memory
        Rtrees = null;
        rawRows = null;
    }

    private void createMVForLevel(int level, int autoDDIndex)
            throws SQLException, ClassNotFoundException {

        System.out.println("Sampling for level " + level + "...");

        AutoDD autoDD = Main.getProject().getAutoDDs().get(autoDDIndex);
        int numLevels = autoDD.getNumLevels();

        // loop through raw query results, sample one by one.
        for (ArrayList<String> rawRow : rawRows) {

            ArrayList<String> bboxRow = new ArrayList<>();
            for (int i = 0; i < rawRow.size(); i++) bboxRow.add(rawRow.get(i));
            bboxRow.add("0"); // place holder for cluster num field

            // centroid of this tuple
            double cx =
                    autoDD.getCanvasCoordinate(
                            level, Double.valueOf(rawRow.get(autoDD.getXColId())), true);
            double cy =
                    autoDD.getCanvasCoordinate(
                            level, Double.valueOf(rawRow.get(autoDD.getYColId())), false);

            // check overlap
            double minx = cx - autoDD.getBboxW() * overlappingThreshold / 2;
            double miny = cy - autoDD.getBboxH() * overlappingThreshold / 2;
            double maxx = cx + autoDD.getBboxW() * overlappingThreshold / 2;
            double maxy = cy + autoDD.getBboxH() * overlappingThreshold / 2;
            Iterable<Entry<ArrayList<String>, Rectangle>> overlappingSamples =
                    Rtrees.get(level)
                            .search(Geometries.rectangle(minx, miny, maxx, maxy))
                            .toBlocking()
                            .toIterable();
            if (overlappingSamples.iterator().hasNext()) continue;

            // sample this object, insert to all levels below this level
            for (int i = level; i < numLevels; i++) {
                cx =
                        autoDD.getCanvasCoordinate(
                                i, Double.valueOf(bboxRow.get(autoDD.getXColId())), true);
                cy =
                        autoDD.getCanvasCoordinate(
                                i, Double.valueOf(bboxRow.get(autoDD.getYColId())), false);
                minx = cx - autoDD.getBboxW() / 2;
                miny = cy - autoDD.getBboxH() / 2;
                maxx = cx + autoDD.getBboxW() / 2;
                maxy = cy + autoDD.getBboxH() / 2;
                ArrayList<String> curRow = new ArrayList<>(bboxRow);
                curRow.add(String.valueOf(cx));
                curRow.add(String.valueOf(cy));
                curRow.add(String.valueOf(minx));
                curRow.add(String.valueOf(miny));
                curRow.add(String.valueOf(maxx));
                curRow.add(String.valueOf(maxy));
                Rtrees.set(
                        i, Rtrees.get(i).add(curRow, Geometries.rectangle(minx, miny, maxx, maxy)));
            }
        }
    }

    private String getAutoDDBboxTableName(int autoDDIndex, int level) {

        return "bbox_"
                + Main.getProject().getName()
                + "_autodd"
                + autoDDIndex
                + "_level"
                + level
                + "layer0";
    }
}
