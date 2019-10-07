package index;

import com.github.davidmoten.rtree.Entry;
import com.github.davidmoten.rtree.RTree;
import com.github.davidmoten.rtree.geometry.Geometries;
import com.github.davidmoten.rtree.geometry.Rectangle;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import java.lang.reflect.Type;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import main.Config;
import main.DbConnector;
import main.Main;
import project.AutoDD;
import project.Canvas;

/** Created by wenbo on 5/6/19. */
public class AutoDDInMemoryIndexer extends PsqlSpatialIndexer {

    private static AutoDDInMemoryIndexer instance = null;
    private final int objectNumLimit = 4000; // in a 1k by 1k region
    private final int virtualViewportSize = 1000;
    private double overlappingThreshold = 1.0;
    private final transient Gson gson;

    // One Rtree per level to store samples
    // https://github.com/davidmoten/rtree
    private ArrayList<RTree<ArrayList<String>, Rectangle>> Rtrees;
    private ArrayList<ArrayList<String>> rawRows;
    private HashMap<String, Integer> aggMap;

    // singleton pattern to ensure only one instance existed
    private AutoDDInMemoryIndexer() {
        this.gson = new GsonBuilder().create();
        this.aggMap = new HashMap();
    }

    // thread-safe instance getter
    public static synchronized AutoDDInMemoryIndexer getInstance() {

        if (instance == null) instance = new AutoDDInMemoryIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        // create MV for all autoDD layers at once
        String autoDDId = c.getLayers().get(layerId).getAutoDDId();
        int levelId = Integer.valueOf(autoDDId.substring(autoDDId.indexOf("_") + 1));
        if (levelId > 0) return;

        // get current AutoDD object
        int autoDDIndex = Integer.valueOf(autoDDId.substring(0, autoDDId.indexOf("_")));
        AutoDD autoDD = Main.getProject().getAutoDDs().get(autoDDIndex);
        int numLevels = autoDD.getNumLevels();
        int numRawColumns = autoDD.getColumnNames().size();
        System.out.println("columns: " + autoDD.getColumnNames());
        System.out.println("aggcolumns: " + autoDD.getAggColumns());
        for (String aggcol : autoDD.getAggColumns()) {
            aggMap.put(aggcol, autoDD.getColumnNames().indexOf(aggcol));
        }

        // calculate overlapping threshold
        this.overlappingThreshold =
                Math.max(
                        0.2,
                        Math.sqrt(
                                        4
                                                * (this.virtualViewportSize + autoDD.getBboxW() * 2)
                                                * (this.virtualViewportSize + autoDD.getBboxH() * 2)
                                                / this.objectNumLimit
                                                / autoDD.getBboxH()
                                                / autoDD.getBboxW())
                                - 1);
        if (!autoDD.getOverlap())
            this.overlappingThreshold = Math.max(this.overlappingThreshold, 1);
        System.out.println("Overlapping threshold: " + this.overlappingThreshold);

        // store raw query results into memory
        this.rawRows = DbConnector.getQueryResult(autoDD.getDb(), autoDD.getQuery());
        // add row number as a BGRP
        Main.getProject().addBGRP("roughN", String.valueOf(this.rawRows.size()));

        // sample for each level
        this.Rtrees = new ArrayList<>();
        for (int i = 0; i < numLevels; i++) this.Rtrees.add(RTree.create());
        for (int i = 0; i < numLevels; i++) createMVForLevel(i, autoDDIndex);

        // compute cluster Aggregate
        if (autoDD.getRenderingMode().equals("object+clusternum")
                || autoDD.getRenderingMode().equals("circle")
                || autoDD.getRenderingMode().equals("circle+object")
                || autoDD.getRenderingMode().equals("contour")
                || autoDD.getRenderingMode().equals("contour+object")
                || autoDD.getRenderingMode().equals("glyph")
                || autoDD.getRenderingMode().equals("glyph+object")
                || autoDD.getRenderingMode().equals("heatmap")
                || autoDD.getRenderingMode().equals("heatmap+object")) {

            // a fake bottom level for non-sampled objects
            this.Rtrees.add(RTree.create());
            for (ArrayList<String> rawRow : this.rawRows) {
                ArrayList<String> bboxRow = new ArrayList<>();
                for (int i = 0; i < rawRow.size(); i++) bboxRow.add(rawRow.get(i));
                bboxRow.add(gson.toJson(getDummyAgg(rawRow, false)));
                this.Rtrees.set(
                        numLevels,
                        this.Rtrees.get(numLevels).add(bboxRow, Geometries.rectangle(0, 0, 0, 0)));
            }

            for (int i = numLevels; i >= 0; i--) {
                // all samples
                Iterable<Entry<ArrayList<String>, Rectangle>> curSamples =
                        this.Rtrees.get(i).entries().toBlocking().toIterable();
                // min clusternum && max clusternum
                // for renderers
                int minWeight = Integer.MAX_VALUE, maxWeight = Integer.MIN_VALUE;
                for (Entry<ArrayList<String>, Rectangle> o : curSamples) {
                    // HashMap<String, Aggregate> rowAgg = getDummyAgg(o);
                    ArrayList<String> curRow = o.value();
                    String curAggStr = curRow.get(numRawColumns);
                    HashMap<String, ArrayList<Double>> curMap = new HashMap<>();
                    Type type = new TypeToken<HashMap<String, ArrayList<Double>>>() {}.getType();
                    curMap = this.gson.fromJson(curAggStr, type);

                    // boundary case: bottom level
                    // if (i == numLevels) curRow.set(numRawColumns, "{}");
                    int count = curMap.entrySet().iterator().next().getValue().get(0).intValue();

                    minWeight = Math.min(minWeight, count);
                    maxWeight = Math.max(maxWeight, count);
                    if (i == 0) continue;

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
                    double minx = cx - autoDD.getBboxW() * this.overlappingThreshold / 2;
                    double miny = cy - autoDD.getBboxH() * this.overlappingThreshold / 2;
                    double maxx = cx + autoDD.getBboxW() * this.overlappingThreshold / 2;
                    double maxy = cy + autoDD.getBboxH() * this.overlappingThreshold / 2;
                    Iterable<Entry<ArrayList<String>, Rectangle>> neighbors =
                            this.Rtrees.get(i - 1)
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
                    // int clusterNumBeforeIncrement =
                    //         Integer.valueOf(nearestNeighbor.get(numRawColumns));
                    // int clusterNumAfterIncrement =
                    //         clusterNumBeforeIncrement +
                    // Integer.valueOf(curRow.get(numRawColumns));
                    // nearestNeighbor.set(numRawColumns, String.valueOf(clusterNumAfterIncrement));

                    String nnAggStr = nearestNeighbor.get(numRawColumns);
                    HashMap<String, ArrayList<Double>> nnMap = new HashMap<>();
                    nnMap = this.gson.fromJson(nnAggStr, type);
                    updateAgg(nnMap, curMap);
                    nearestNeighbor.set(numRawColumns, gson.toJson(nnMap));
                }

                // add min & max weight into rendering params
                if (i < numLevels) {
                    autoDDId = String.valueOf(autoDDIndex) + "_" + String.valueOf(i);
                    Main.getProject().addBGRP(autoDDId + "_minWeight", String.valueOf(minWeight));
                    Main.getProject().addBGRP(autoDDId + "_maxWeight", String.valueOf(maxWeight));
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
                    "cluster_agg text, cx double precision, cy double precision, minx double precision, miny double precision, "
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
                    this.Rtrees.get(i).entries().toBlocking().toIterable();
            for (Entry<ArrayList<String>, Rectangle> o : samples) {
                ArrayList<String> curRow = o.value();

                // raw data fields & cluster agg
                for (int k = 0; k <= numRawColumns; k++)
                    preparedStmt.setString(k + 1, curRow.get(k).replaceAll("\'", "\'\'"));

                // bounding box fields
                for (int k = 1; k <= 6; k++)
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
        this.Rtrees = null;
        this.rawRows = null;
    }

    private void createMVForLevel(int level, int autoDDIndex)
            throws SQLException, ClassNotFoundException {

        System.out.println("Sampling for level " + level + "...");
        AutoDD autoDD = Main.getProject().getAutoDDs().get(autoDDIndex);
        int numLevels = autoDD.getNumLevels();

        // loop through raw query results, sample one by one.
        for (ArrayList<String> rawRow : this.rawRows) {

            ArrayList<String> bboxRow = new ArrayList<>();
            for (int i = 0; i < rawRow.size(); i++) bboxRow.add(rawRow.get(i));
            bboxRow.add(
                    gson.toJson(
                            getDummyAgg(rawRow, true))); // place holder for cluster aggregate field

            // centroid of this tuple
            double cx =
                    autoDD.getCanvasCoordinate(
                            level, Double.valueOf(rawRow.get(autoDD.getXColId())), true);
            double cy =
                    autoDD.getCanvasCoordinate(
                            level, Double.valueOf(rawRow.get(autoDD.getYColId())), false);

            // check overlap
            double minx = cx - autoDD.getBboxW() * this.overlappingThreshold / 2;
            double miny = cy - autoDD.getBboxH() * this.overlappingThreshold / 2;
            double maxx = cx + autoDD.getBboxW() * this.overlappingThreshold / 2;
            double maxy = cy + autoDD.getBboxH() * this.overlappingThreshold / 2;
            Iterable<Entry<ArrayList<String>, Rectangle>> overlappingSamples =
                    this.Rtrees.get(level)
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
                minx = cx - autoDD.getBboxW() * this.overlappingThreshold / 2;
                miny = cy - autoDD.getBboxH() * this.overlappingThreshold / 2;
                maxx = cx + autoDD.getBboxW() * this.overlappingThreshold / 2;
                maxy = cy + autoDD.getBboxH() * this.overlappingThreshold / 2;
                this.Rtrees.set(
                        i,
                        this.Rtrees.get(i)
                                .add(curRow, Geometries.rectangle(minx, miny, maxx, maxy)));
            }
        }
    }

    private String getAutoDDBboxTableName(int autoDDIndex, int level) {

        String autoDDId = String.valueOf(autoDDIndex) + "_" + String.valueOf(level);
        for (Canvas c : Main.getProject().getCanvases()) {
            int numLayers = c.getLayers().size();
            for (int layerId = 0; layerId < numLayers; layerId++) {
                String curAutoDDId = c.getLayers().get(layerId).getAutoDDId();
                if (curAutoDDId == null) continue;
                if (curAutoDDId.equals(autoDDId))
                    return "bbox_"
                            + Main.getProject().getName()
                            + "_"
                            + c.getId()
                            + "layer"
                            + layerId;
            }
        }
        return "";
    }

    // if flag == true, use constant; if flag == false, use row info
    private HashMap<String, ArrayList<Double>> getDummyAgg(ArrayList<String> row, boolean flag) {
        HashMap<String, ArrayList<Double>> dummy = new HashMap<>();
        for (Map.Entry<String, Integer> entry : this.aggMap.entrySet()) {
            // System.out.println("Key = " + entry.getKey() + ", Value = " + entry.getValue());
            ArrayList<Double> arr = new ArrayList<>();
            if (flag) {
                arr.add(0.0);
                arr.add(0.0);
                arr.add(Double.MIN_VALUE);
                arr.add(Double.MAX_VALUE);
                arr.add(0.0);
            } else {
                Double value = 0.0;
                try {
                    value = Double.parseDouble(row.get(entry.getValue()));
                } catch (Exception e) {
                    throw new Error("Indexing AutoDD: Aggregate Column must be numeric");
                }
                arr.add(1.0); // count
                arr.add(value); // sum
                arr.add(value); // max
                arr.add(value); // min
                arr.add(value * value); // squaresum
            }
            dummy.put(entry.getKey(), arr);
        }
        return dummy;
    }

    private HashMap<String, ArrayList<Double>> updateAgg(
            HashMap<String, ArrayList<Double>> parent, HashMap<String, ArrayList<Double>> child) {
        // System.out.println("parent before: " + parent);
        for (Map.Entry<String, Integer> entry : this.aggMap.entrySet()) {
            // Aggregate entry: [count, sum, max, min, squaresum]
            String key = entry.getKey();
            ArrayList<Double> p = parent.get(key);
            ArrayList<Double> c = child.get(key);
            // count
            p.set(0, p.get(0) + c.get(0));
            // sum
            p.set(1, p.get(1) + c.get(1));
            // max
            if (c.get(2) > p.get(2)) p.set(2, c.get(2));
            // min
            if (c.get(3) < p.get(3)) p.set(3, c.get(3));
            // squaresum
            p.set(4, p.get(4) + c.get(4));
        }
        // System.out.println("parent after:" + parent);
        return parent;
    }
}

/*class ArrayList<Double> {
    public int count;
    public double sum;
    public double max;
    public double min;
    public double squaresum;

    ArrayList<Double>() {
        this.count = 0;
        this.sum = 0;
        this.min = Integer.MAX_VALUE;
        this.max = Integer.MIN_VALUE;
        this.squaresum = 0;
    }

    ArrayList<Double>(int _count, double _sum, double _min, double _max, double _squaresum) {
        this.count = _count;
        this.sum = _sum;
        this.min = _min;
        this.max = _max;
        this.squaresum = _squaresum;
    }

    @Override
    public String toString() {
        return "{"
                + "count: "
                + count
                + ", sum: "
                + sum
                + ", min: "
                + min
                + ", max: "
                + max
                + ", squaresum: "
                + squaresum
                + '}';
    }
}*/
