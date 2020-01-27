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
import java.util.Arrays;
import java.util.HashMap;
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
    private final String aggKeyDelimiter = "__";
    private final transient Gson gson;

    // One Rtree per level to store samples
    // https://github.com/davidmoten/rtree
    private ArrayList<RTree<ArrayList<String>, Rectangle>> Rtrees;
    private ArrayList<ArrayList<String>> rawRows;
    private AutoDD autoDD;

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
        String curAutoDDId = c.getLayers().get(layerId).getAutoDDId();
        int levelId = Integer.valueOf(curAutoDDId.substring(curAutoDDId.indexOf("_") + 1));
        if (levelId > 0) return;

        // get current AutoDD object
        int autoDDIndex = Integer.valueOf(curAutoDDId.substring(0, curAutoDDId.indexOf("_")));
        autoDD = Main.getProject().getAutoDDs().get(autoDDIndex);
        int numLevels = autoDD.getNumLevels();
        int numRawColumns = autoDD.getColumnNames().size();

        System.out.println("aggDimensionFields: " + autoDD.getAggDimensionFields());
        System.out.println("aggMeasureFields: " + autoDD.getAggMeasureFields());

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
        overlappingThreshold = Math.max(overlappingThreshold, autoDD.getOverlap());
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
            bboxRow.add(gson.toJson(getInitialClusterAgg(rawRow, true)));
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

                // get clusterAgg
                String curAggStr = curRow.get(numRawColumns);
                HashMap<String, String> curClusterAgg;
                curClusterAgg = gson.fromJson(curAggStr, HashMap.class);

                int count = Integer.valueOf(curClusterAgg.get("count(*)"));
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
                    }
                }
                String nnAggStr = nearestNeighbor.get(numRawColumns);
                HashMap<String, String> nnAggMap;
                nnAggMap = gson.fromJson(nnAggStr, HashMap.class);
                mergeClusterAgg(nnAggMap, curClusterAgg);
                nearestNeighbor.set(numRawColumns, gson.toJson(nnAggMap));
            }

            // add min & max weight into rendering params
            if (i < numLevels) {
                curAutoDDId = String.valueOf(autoDDIndex) + "_" + String.valueOf(i);
                Main.getProject().addBGRP(curAutoDDId + "_minWeight", String.valueOf(minWeight));
                Main.getProject().addBGRP(curAutoDDId + "_maxWeight", String.valueOf(maxWeight));
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
                    "clusterAgg text, cx double precision, cy double precision, minx double precision, miny double precision, "
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
            bboxRow.add(gson.toJson(getInitialClusterAgg(rawRow, false)));

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

    private HashMap<String, String> getInitialClusterAgg(
            ArrayList<String> row, boolean isLeafNode) {
        HashMap<String, String> clusterAgg = new HashMap<>();
        if (!isLeafNode) return clusterAgg;

        // count(*)
        clusterAgg.put("count(*)", "1");

        // convexHull
        double cx =
                autoDD.getCanvasCoordinate(
                        autoDD.getNumLevels(), Double.valueOf(row.get(autoDD.getXColId())), true);
        double cy =
                autoDD.getCanvasCoordinate(
                        autoDD.getNumLevels(), Double.valueOf(row.get(autoDD.getYColId())), false);
        double minx = cx - autoDD.getBboxW() / 2.0, maxx = cx + autoDD.getBboxW() / 2.0;
        double miny = cy - autoDD.getBboxH() / 2.0, maxy = cy + autoDD.getBboxH() / 2.0;
        ArrayList<ArrayList<Double>> convexHull = new ArrayList<>();
        convexHull.add(new ArrayList<>(Arrays.asList(minx, miny)));
        convexHull.add(new ArrayList<>(Arrays.asList(minx, maxy)));
        convexHull.add(new ArrayList<>(Arrays.asList(maxx, maxy)));
        convexHull.add(new ArrayList<>(Arrays.asList(maxx, miny)));
        clusterAgg.put("convexHull", gson.toJson(convexHull));

        // topk
        if (autoDD.getTopk() > 0) {
            ArrayList<HashMap<String, String>> topk = new ArrayList<>();
            HashMap<String, String> curMap = new HashMap<>();
            for (int i = 0; i < row.size(); i++)
                curMap.put(autoDD.getColumnNames().get(i), row.get(i));
            topk.add(curMap);
            clusterAgg.put("topk", gson.toJson(topk));
        }

        // numeric aggregations
        String curDimensionStr = "";
        for (String dimension : autoDD.getAggDimensionFields()) {
            if (curDimensionStr.length() > 0) curDimensionStr += aggKeyDelimiter;
            curDimensionStr += row.get(autoDD.getColumnNames().indexOf(dimension));
        }
        int numMeasures = autoDD.getAggMeasureFields().size();
        for (int i = 0; i < numMeasures; i++) {
            // always calculate count(*)
            clusterAgg.put(curDimensionStr + aggKeyDelimiter + "count(*)", "1");

            // calculate other stuff if current measure is not count(*)
            String curMeasureField = autoDD.getAggMeasureFields().get(i);
            if (!curMeasureField.equals("*")) {
                String curValue = row.get(autoDD.getColumnNames().indexOf(curMeasureField));
                clusterAgg.put(
                        curDimensionStr + aggKeyDelimiter + "sum(" + curMeasureField + ")",
                        curValue);
                clusterAgg.put(
                        curDimensionStr + aggKeyDelimiter + "max(" + curMeasureField + ")",
                        curValue);
                clusterAgg.put(
                        curDimensionStr + aggKeyDelimiter + "min(" + curMeasureField + ")",
                        curValue);
                clusterAgg.put(
                        curDimensionStr + aggKeyDelimiter + "sqrsum(" + curMeasureField + ")",
                        String.valueOf(Double.valueOf(curValue) * Double.valueOf(curValue)));
            }
        }

        return clusterAgg;
    }

    // this function assumes that convexHull of child
    // is from one level lower than parent
    private void mergeClusterAgg(HashMap<String, String> parent, HashMap<String, String> child) {

        // count(*)
        if (!parent.containsKey("count(*)")) parent.put("count(*)", child.get("count(*)"));
        else {
            int parentCount = Integer.valueOf(parent.get("count(*)"));
            int childCount = Integer.valueOf(child.get("count(*)"));
            parent.put("count(*)", String.valueOf(parentCount + childCount));
        }

        // convexHull
        ArrayList<ArrayList<Double>> childConvexHull;
        childConvexHull = gson.fromJson(child.get("convexHull"), ArrayList.class);
        for (int i = 0; i < childConvexHull.size(); i++)
            for (int j = 0; j < 2; j++)
                childConvexHull
                        .get(i)
                        .set(j, childConvexHull.get(i).get(j) / autoDD.getZoomFactor());

        if (!parent.containsKey("convexHull"))
            parent.put("convexHull", gson.toJson(childConvexHull));
        else {
            ArrayList<ArrayList<Double>> parentConvexHull;
            parentConvexHull = gson.fromJson(parent.get("convexHull"), ArrayList.class);
            parent.put("convexHull", gson.toJson(mergeConvex(parentConvexHull, childConvexHull)));
        }

        // topk
        if (!parent.containsKey("topk")) parent.put("topk", child.get("topk"));
        else {
            Type topkType = new TypeToken<ArrayList<HashMap<String, String>>>() {}.getType();
            ArrayList<HashMap<String, String>> parentTopk =
                    gson.fromJson(parent.get("topk"), topkType);
            ArrayList<HashMap<String, String>> childTopk =
                    gson.fromJson(child.get("topk"), topkType);
            ArrayList<HashMap<String, String>> mergedTopk = new ArrayList<>();
            String zCol = autoDD.getzCol();
            String zOrder = autoDD.getzOrder();
            int topk = autoDD.getTopk();
            int parentIter = 0, childIter = 0;
            while ((parentIter < parentTopk.size() || childIter < childTopk.size())
                    && mergedTopk.size() < topk) {
                if (parentIter >= parentTopk.size()) mergedTopk.add(childTopk.get(childIter));
                else if (childIter >= childTopk.size()) mergedTopk.add(parentTopk.get(parentIter));
                else {
                    HashMap<String, String> parentHead = parentTopk.get(parentIter);
                    HashMap<String, String> childHead = childTopk.get(childIter);
                    double parentValue = Double.valueOf(parentHead.get(zCol));
                    double childValue = Double.valueOf(childHead.get(zCol));
                    if ((parentValue <= childValue && zOrder.equals("asc"))
                            || (parentValue >= childValue && zOrder.equals("desc"))) {
                        mergedTopk.add(parentHead);
                        parentIter++;
                    } else {
                        mergedTopk.add(childHead);
                        childIter++;
                    }
                }
            }
            parent.put("topk", gson.toJson(mergedTopk));
        }

        // numeric aggregations
        for (String aggKey : child.keySet()) {
            if (aggKey.equals("count(*)") || aggKey.equals("convexHull") || aggKey.equals("topk"))
                continue;
            if (!parent.containsKey(aggKey)) parent.put(aggKey, child.get(aggKey));
            else {
                String curFunc =
                        aggKey.substring(
                                aggKey.lastIndexOf(aggKeyDelimiter) + aggKeyDelimiter.length(),
                                aggKey.lastIndexOf("("));
                Double parentValue = Double.valueOf(parent.get(aggKey));
                Double childValue = Double.valueOf(child.get(aggKey));
                switch (curFunc) {
                    case "count":
                    case "sum":
                    case "sqrsum":
                        parent.put(aggKey, String.valueOf(parentValue + childValue));
                        break;
                    case "min":
                        parent.put(aggKey, String.valueOf(Math.min(parentValue, childValue)));
                        break;
                    case "max":
                        parent.put(aggKey, String.valueOf(Math.max(parentValue, childValue)));
                        break;
                }
            }
        }
    }

    private ArrayList<ArrayList<Double>> mergeConvex(
            ArrayList<ArrayList<Double>> parent, ArrayList<ArrayList<Double>> child) {
        Geometry parentGeom = getGeometryFromDoubleArray(parent);
        Geometry childGeom = getGeometryFromDoubleArray(child);
        Geometry union = parentGeom.union(childGeom);
        return getCoordsListOfGeometry(union.convexHull());
    }

    private Geometry getGeometryFromDoubleArray(ArrayList<ArrayList<Double>> coords) {
        GeometryFactory gf = new GeometryFactory();
        ArrayList<Point> points = new ArrayList<>();
        for (int i = 0; i < coords.size(); i++) {
            double x = coords.get(i).get(0);
            double y = coords.get(i).get(1);
            points.add(gf.createPoint(new Coordinate(x, y)));
        }
        Geometry geom = gf.createMultiPoint(GeometryFactory.toPointArray(points));
        return geom;
    }

    private ArrayList<ArrayList<Double>> getCoordsListOfGeometry(Geometry geometry) {
        Coordinate[] coordinates = geometry.getCoordinates();
        ArrayList<ArrayList<Double>> coordsList = new ArrayList<>();
        for (Coordinate coordinate : coordinates)
            coordsList.add(new ArrayList<>(Arrays.asList(coordinate.x, coordinate.y)));
        return coordsList;
    }
}
