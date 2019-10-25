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
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
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
    private transient ArrayList<RTree<ArrayList<String>, Rectangle>> Rtrees;
    private transient ArrayList<ArrayList<String>> rawRows;
    private transient HashMap<String, Integer> aggMap;
    private transient AggMode aggMode;
    private transient AutoDD autoDD;

    private enum AggMode {
        NUMERIC,
        CATEGORICAL
    };

    // singleton pattern to ensure only one instance existed
    private AutoDDInMemoryIndexer() {
        gson = new GsonBuilder().create();
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
        autoDD = Main.getProject().getAutoDDs().get(autoDDIndex);
        int numLevels = autoDD.getNumLevels();
        int numRawColumns = autoDD.getColumnNames().size();

        aggMap = new HashMap();
        aggMode = AggMode.NUMERIC;
        System.out.println("columns: " + autoDD.getColumnNames());
        System.out.println("aggcolumns: " + autoDD.getAggColumns());
        // mode 0: numeric, mode 1: categorical
        for (String aggcol : autoDD.getAggColumns()) {
            if (aggcol.substring(0, 5).equals("mode:")) {
                if (aggcol.substring(5).equals("category")) aggMode = AggMode.CATEGORICAL;
                if (aggcol.substring(5).equals("number")) aggMode = AggMode.NUMERIC;
            } else {
                aggMap.put(aggcol, autoDD.getColumnNames().indexOf(aggcol));
            }
        }
        System.out.println("this.aggMap: " + aggMap);
        System.out.println("this.aggMode: " + aggMode);

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
                                                / autoDD.getBboxW())
                                - 1);
        if (!autoDD.getOverlap()) overlappingThreshold = Math.max(overlappingThreshold, 1);
        System.out.println("Overlapping threshold: " + overlappingThreshold);

        // store raw query results into memory
        rawRows = DbConnector.getQueryResult(autoDD.getDb(), autoDD.getQuery());
        // add row number as a BGRP
        Main.getProject().addBGRP("roughN", String.valueOf(rawRows.size()));

        // sample for each level
        Rtrees = new ArrayList<>();
        for (int i = 0; i < numLevels; i++) Rtrees.add(RTree.create());
        for (int i = 0; i < numLevels; i++) createMVForLevel(i, autoDDIndex);

        // compute cluster Aggregate
        // a fake bottom level for non-sampled objects
        Rtrees.add(RTree.create());
        for (ArrayList<String> rawRow : rawRows) {
            ArrayList<String> bboxRow = new ArrayList<>();
            for (int i = 0; i < rawRow.size(); i++) bboxRow.add(rawRow.get(i));
            bboxRow.add(gson.toJson(getDummyAgg(rawRow, false)));
            Rtrees.set(
                    numLevels,
                    Rtrees.get(numLevels).add(bboxRow, Geometries.rectangle(0, 0, 0, 0)));
        }

        for (int i = numLevels; i >= 0; i--) {
            // all samples
            Iterable<Entry<ArrayList<String>, Rectangle>> curSamples =
                    Rtrees.get(i).entries().toBlocking().toIterable();

            // for renderers
            int minWeight = Integer.MAX_VALUE, maxWeight = Integer.MIN_VALUE;
            for (Entry<ArrayList<String>, Rectangle> o : curSamples) {
                ArrayList<String> curRow = o.value();
                String curAggStr = curRow.get(numRawColumns);

                HashMap<String, ArrayList<Double>> curMap;
                Type type = new TypeToken<HashMap<String, ArrayList<Double>>>() {}.getType();
                curMap = gson.fromJson(curAggStr, type);

                int count = curMap.get("count").get(0).intValue();
                // System.out.println("count: " + count);

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
                double minx = cx - autoDD.getBboxW() * overlappingThreshold / 2;
                double miny = cy - autoDD.getBboxH() * overlappingThreshold / 2;
                double maxx = cx + autoDD.getBboxW() * overlappingThreshold / 2;
                double maxy = cy + autoDD.getBboxH() * overlappingThreshold / 2;
                Iterable<Entry<ArrayList<String>, Rectangle>> neighbors =
                        Rtrees.get(i - 1)
                                .search(Geometries.rectangle(minx, miny, maxx, maxy))
                                .toBlocking()
                                .toIterable();
                double minCx = cx, minCy = cy;
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
                    double curDistance = (cx - curCx) * (cx - curCx) + (cy - curCy) * (cy - curCy);
                    if (curDistance < minDistance) {
                        minDistance = curDistance;
                        nearestNeighbor = curNeighbor;
                        minCx = curCx;
                        minCy = curCy;
                    }
                }
                double minMinx = minCx - autoDD.getBboxW() * overlappingThreshold / 2;
                double minMiny = minCy - autoDD.getBboxH() * overlappingThreshold / 2;
                double minMaxx = minCx + autoDD.getBboxW() * overlappingThreshold / 2;
                double minMaxy = minCy + autoDD.getBboxH() * overlappingThreshold / 2;

                String nnAggStr = nearestNeighbor.get(numRawColumns);
                HashMap<String, ArrayList<Double>> nnMap = new HashMap<>();
                nnMap = gson.fromJson(nnAggStr, type);
                ArrayList<Double> bbox =
                        getBboxCoordsList(
                                minx * autoDD.getZoomFactor(),
                                miny * autoDD.getZoomFactor(),
                                maxx * autoDD.getZoomFactor(),
                                maxy * autoDD.getZoomFactor());
                ArrayList<Double> nnBbox = getBboxCoordsList(minMinx, minMiny, minMaxx, minMaxy);
                nnMap.putIfAbsent("convexhull", nnBbox);
                curMap.putIfAbsent("convexhull", bbox);

                if (nearestNeighbor.get(0).equals("L. Messi")) {
                    // System.out.println("Level:" + i + " before Messi: " + nearestNeighbor);
                    // System.out.println("Level:" + i + " before curRow: " + curRow);
                    // System.out.println("centroid: " + centroid);
                    // System.out.println("nnCentroid: " + nnCentroid);
                    // System.out.println("level: " + i);
                    // System.out.println("bbox: " + bbox);
                    // System.out.println("nnBbox: " + nnBbox);
                    // System.out.println("curRow: " + curRow.get(0));
                    // System.out.println("before curMap convexhull: " +
                    // curMap.get("convexhull"));
                    // System.out.println("nearestNeighbor: " + nearestNeighbor.get(0));
                    // System.out.println(" before nnMap convexhull: " +
                    // nnMap.get("convexhull"));
                }

                updateAgg(nnMap, curMap);
                nearestNeighbor.set(numRawColumns, gson.toJson(nnMap));
                if (nearestNeighbor.get(0).equals("L. Messi")) {
                    // System.out.println("after convexhull : " + nnMap.get("convexhull"));
                    // System.out.println("Level:" + i + " after Messi: " + nearestNeighbor);
                }
            }

            // add min & max weight into rendering params
            if (i < numLevels) {
                autoDDId = String.valueOf(autoDDIndex) + "_" + String.valueOf(i);
                Main.getProject().addBGRP(autoDDId + "_minWeight", String.valueOf(minWeight));
                Main.getProject().addBGRP(autoDDId + "_maxWeight", String.valueOf(maxWeight));
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
                    Rtrees.get(i).entries().toBlocking().toIterable();
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
        Rtrees = null;
        rawRows = null;
        aggMap = null;
        autoDD = null;
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

            // place holder for cluster aggregate field
            bboxRow.add(gson.toJson(getDummyAgg(rawRow, true)));

            // if (rawRow.get(0).equals("L. Messi")){
            //     System.out.println("Level: " + level + " Messi bboxRow: " + bboxRow);
            // }

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
                minx = cx - autoDD.getBboxW() * overlappingThreshold / 2;
                miny = cy - autoDD.getBboxH() * overlappingThreshold / 2;
                maxx = cx + autoDD.getBboxW() * overlappingThreshold / 2;
                maxy = cy + autoDD.getBboxH() * overlappingThreshold / 2;
                Rtrees.set(
                        i, Rtrees.get(i).add(curRow, Geometries.rectangle(minx, miny, maxx, maxy)));
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
        if (aggMode == AggMode.NUMERIC) {
            for (Map.Entry<String, Integer> entry : aggMap.entrySet()) {
                // System.out.println("Key = " + entry.getKey() + ", Value = " + entry.getValue());
                ArrayList<Double> curClusterAgg = new ArrayList<>();
                if (flag) {
                    curClusterAgg.add(0.0);
                    curClusterAgg.add(Double.MIN_VALUE);
                    curClusterAgg.add(Double.MAX_VALUE);
                    curClusterAgg.add(0.0);
                } else {
                    Double value = Double.valueOf(row.get(entry.getValue()));
                    curClusterAgg.add(value); // sum
                    curClusterAgg.add(value); // max
                    curClusterAgg.add(value); // min
                    curClusterAgg.add(value * value); // squaresum
                }
                dummy.put(entry.getKey(), curClusterAgg);
            }
        } else if (aggMode == AggMode.CATEGORICAL) {
            String category = "";
            ArrayList<Double> curClusterAgg = new ArrayList<>();
            for (Map.Entry<String, Integer> entry : aggMap.entrySet()) {
                curClusterAgg = new ArrayList<>();
                if (flag) curClusterAgg.add(0.0);
                else curClusterAgg.add(1.0);
                category = category.concat(row.get(entry.getValue())).concat("+");
            }
            dummy.put(category.substring(0, category.length() - 1), curClusterAgg);
        }
        ArrayList<Double> countArr = new ArrayList<>();
        if (flag) countArr.add(0.0);
        else countArr.add(1.0);
        dummy.put("count", countArr);
        return dummy;
    }

    private HashMap<String, ArrayList<Double>> updateAgg(
            HashMap<String, ArrayList<Double>> parent, HashMap<String, ArrayList<Double>> child) {
        // System.out.println("parent before: " + parent);
        if (aggMode == AggMode.NUMERIC) {
            for (Map.Entry<String, Integer> entry : aggMap.entrySet()) {
                // Aggregate entry: [count, sum, max, min, squaresum]
                String key = entry.getKey();
                ArrayList<Double> p = parent.get(key);
                ArrayList<Double> c = child.get(key);
                // sum
                p.set(0, p.get(0) + c.get(0));
                // max
                if (c.get(1) > p.get(1)) p.set(1, c.get(1));
                // min
                if (c.get(2) < p.get(2)) p.set(2, c.get(2));
                // squaresum
                p.set(3, p.get(3) + c.get(3));
            }
            parent.get("count").set(0, parent.get("count").get(0) + child.get("count").get(0));
        } else if (aggMode == AggMode.CATEGORICAL) {
            // default value
            ArrayList<Double> zero = new ArrayList<>();
            zero.add(0.0);
            for (Map.Entry<String, ArrayList<Double>> pentry : parent.entrySet()) {
                String pkey = pentry.getKey();
                if (!(pkey.equals("convexhull"))) {
                    ArrayList<Double> p = parent.get(pkey);
                    ArrayList<Double> c = child.getOrDefault(pkey, zero);
                    // count
                    p.set(0, p.get(0) + c.get(0));
                }
            }
            for (Map.Entry<String, ArrayList<Double>> centry : child.entrySet()) {
                String ckey = centry.getKey();
                if (!(ckey.equals("convexhull"))) {
                    ArrayList<Double> c = child.get(ckey);
                    parent.putIfAbsent(ckey, c);
                }
            }
        }
        ArrayList<Double> pconvex = parent.get("convexhull");
        ArrayList<Double> cconvex = child.get("convexhull");
        ArrayList<Double> cconvex_small = new ArrayList<>();
        for (int i = 0; i < cconvex.size(); i++) {
            cconvex_small.add(cconvex.get(i) / autoDD.getZoomFactor());
        }

        pconvex = updateConvex(pconvex, cconvex_small);

        parent.put("convexhull", pconvex);
        // System.out.println("parent convexhull after:" + parent.get("convexhull"));

        return parent;
    }

    private ArrayList<Double> updateConvex(ArrayList<Double> parent, ArrayList<Double> child) {
        Geometry pgeom = getGeometry(parent);
        Geometry cgeom = getGeometry(child);
        Geometry union = pgeom.union(cgeom);
        Coordinate[] coordinates = pgeom.getCoordinates();
        // System.out.println("before:" + parent);
        parent = getCoordsList(union.convexHull());
        // System.out.println("after:" + parent);
        return parent;
    }

    static Geometry getGeometry(ArrayList<Double> coords) {
        GeometryFactory gf = new GeometryFactory();
        int size = coords.size() / 2;
        ArrayList<Point> points = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            double x = coords.get(i * 2);
            double y = coords.get(i * 2 + 1);
            points.add(gf.createPoint(new Coordinate(x, y)));
        }
        Geometry geom = gf.createMultiPoint(GeometryFactory.toPointArray(points));
        return geom;
    }

    ArrayList<Double> getCoordsList(Geometry geometry) {
        Coordinate[] coordinates = geometry.getCoordinates();
        ArrayList<Double> coordsList = new ArrayList<>();
        for (Coordinate coordinate : coordinates) {
            coordsList.add(coordinate.x);
            coordsList.add(coordinate.y);
        }
        return coordsList;
    }

    ArrayList<Double> getBboxCoordsList(double minx, double miny, double maxx, double maxy) {
        ArrayList<Double> coords = new ArrayList<>();
        coords.add(minx);
        coords.add(miny);
        coords.add(minx);
        coords.add(maxy);
        coords.add(maxx);
        coords.add(maxy);
        coords.add(maxx);
        coords.add(miny);
        return coords;
    }
}
