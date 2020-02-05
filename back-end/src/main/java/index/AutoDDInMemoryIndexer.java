package index;

import com.github.davidmoten.rtree.Entry;
import com.github.davidmoten.rtree.RTree;
import com.github.davidmoten.rtree.geometry.Geometries;
import com.github.davidmoten.rtree.geometry.Rectangle;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
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

    private class RTreeData {
        ArrayList<String> row;
        HashMap<String, Double> numericalAggs;
        ArrayList<ArrayList<Double>> convexHull;
        ArrayList<HashMap<String, String>> topk;

        RTreeData(ArrayList<String> _row) {
            row = new ArrayList<>();
            for (int i = 0; i < _row.size(); i++) row.add(_row.get(i));
            numericalAggs = null;
            convexHull = null;
            topk = null;
        }

        public String getClusterAggString() {
            JsonObject jsonObj = new JsonObject();

            // add numeric aggs
            for (String key : numericalAggs.keySet())
                jsonObj.addProperty(key, numericalAggs.get(key));

            // turn convexhull into json array of json arrays
            JsonArray convexHullArr = new JsonArray();
            for (int i = 0; i < convexHull.size(); i++) {
                JsonArray arr = new JsonArray();
                arr.add(convexHull.get(i).get(0));
                arr.add(convexHull.get(i).get(1));
                convexHullArr.add(arr);
            }
            jsonObj.add("convexHull", convexHullArr);

            // turn topk into an array of json objects
            JsonArray topkArr = new JsonArray();
            for (int i = 0; i < topk.size(); i++) {
                JsonObject obj = new JsonObject();
                for (String key : topk.get(i).keySet()) obj.addProperty(key, topk.get(i).get(key));
                topkArr.add(obj);
            }
            jsonObj.add("topk", topkArr);

            return gson.toJson(jsonObj);
        }
    }

    private static AutoDDInMemoryIndexer instance = null;
    private final int objectNumLimit = 4000; // in a 1k by 1k region
    private final int virtualViewportSize = 1000;
    private double overlappingThreshold = 1.0;
    private final String aggKeyDelimiter = "__";
    private final Gson gson;
    private int autoDDIndex, numLevels, numRawColumns;
    private Statement bboxStmt;

    // One Rtree per level to store samples
    // https://github.com/davidmoten/rtree
    private ArrayList<RTree<RTreeData, Rectangle>> Rtrees;
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
        autoDDIndex = Integer.valueOf(curAutoDDId.substring(0, curAutoDDId.indexOf("_")));

        // set common variables
        setCommonVariables();

        long st = System.nanoTime();
        // sample for levels
        sampleForLevels();
        System.out.println("Sampling took " + (System.nanoTime() - st) / 1e9 + "s.");

        // compute cluster aggregations
        st = System.nanoTime();
        computeClusterAggs();
        System.out.println("Computer ClusterAggs took " + (System.nanoTime() - st) / 1e9 + "s.");

        // write stuff to the database
        st = System.nanoTime();
        writeToDB();
        System.out.println("Writing to DB took " + (System.nanoTime() - st) / 1e9 + "s.");

        // calculate BGRP
        st = System.nanoTime();
        calculateBGRP();
        System.out.println("Calculating BGRP took " + (System.nanoTime() - st) / 1e9 + "s.");

        // clean up
        cleanUp();
    }

    private void setCommonVariables() throws SQLException, ClassNotFoundException {
        // get current AutoDD object
        autoDD = Main.getProject().getAutoDDs().get(autoDDIndex);
        numLevels = autoDD.getNumLevels();
        numRawColumns = autoDD.getColumnNames().size();

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
    }

    private void sampleForLevels() throws SQLException, ClassNotFoundException {

        // sample for each level
        Rtrees = new ArrayList<>();
        for (int i = 0; i < numLevels; i++) Rtrees.add(RTree.create());
        for (int i = 0; i < numLevels; i++) sampleForLevel(i);

        // a fake bottom level for non-sampled objects
        Rtrees.add(RTree.create());
        for (ArrayList<String> rawRow : rawRows) {
            RTreeData rd = new RTreeData(rawRow);
            setInitialClusterAgg(rd);
            Rtrees.set(numLevels, Rtrees.get(numLevels).add(rd, Geometries.rectangle(0, 0, 0, 0)));
        }
    }

    private void sampleForLevel(int level) throws SQLException, ClassNotFoundException {

        System.out.println("Sampling for level " + level + "...");
        AutoDD autoDD = Main.getProject().getAutoDDs().get(autoDDIndex);
        int numLevels = autoDD.getNumLevels();

        // loop through raw query results, sample one by one.
        for (ArrayList<String> rawRow : rawRows) {

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
            Iterable<Entry<RTreeData, Rectangle>> overlappingSamples =
                    Rtrees.get(level)
                            .search(Geometries.rectangle(minx, miny, maxx, maxy))
                            .toBlocking()
                            .toIterable();
            if (overlappingSamples.iterator().hasNext()) continue;

            // sample this object, insert to all levels below this level
            for (int i = level; i < numLevels; i++) {
                cx =
                        autoDD.getCanvasCoordinate(
                                i, Double.valueOf(rawRow.get(autoDD.getXColId())), true);
                cy =
                        autoDD.getCanvasCoordinate(
                                i, Double.valueOf(rawRow.get(autoDD.getYColId())), false);
                minx = cx - autoDD.getBboxW() / 2;
                miny = cy - autoDD.getBboxH() / 2;
                maxx = cx + autoDD.getBboxW() / 2;
                maxy = cy + autoDD.getBboxH() / 2;

                RTreeData rd = new RTreeData(rawRow);
                rd.row.add(String.valueOf(cx));
                rd.row.add(String.valueOf(cy));
                rd.row.add(String.valueOf(minx));
                rd.row.add(String.valueOf(miny));
                rd.row.add(String.valueOf(maxx));
                rd.row.add(String.valueOf(maxy));
                minx = cx - autoDD.getBboxW() * overlappingThreshold / 2;
                miny = cy - autoDD.getBboxH() * overlappingThreshold / 2;
                maxx = cx + autoDD.getBboxW() * overlappingThreshold / 2;
                maxy = cy + autoDD.getBboxH() * overlappingThreshold / 2;
                Rtrees.set(i, Rtrees.get(i).add(rd, Geometries.rectangle(minx, miny, maxx, maxy)));
            }
        }
    }

    private void computeClusterAggs() {

        // compute cluster Aggregate
        for (int i = numLevels; i > 0; i--) {
            // all samples
            Iterable<Entry<RTreeData, Rectangle>> curSamples =
                    Rtrees.get(i).entries().toBlocking().toIterable();

            // for renderers
            for (Entry<RTreeData, Rectangle> o : curSamples) {
                RTreeData rd = o.value();

                // find its nearest neighbor in one level up
                // using binary search + Rtree
                double minDistance = Double.MAX_VALUE;
                RTreeData nearestNeighbor = null;
                double cx =
                        autoDD.getCanvasCoordinate(
                                i - 1, Double.valueOf(rd.row.get(autoDD.getXColId())), true);
                double cy =
                        autoDD.getCanvasCoordinate(
                                i - 1, Double.valueOf(rd.row.get(autoDD.getYColId())), false);
                double minx = cx - autoDD.getBboxW() * overlappingThreshold / 2;
                double miny = cy - autoDD.getBboxH() * overlappingThreshold / 2;
                double maxx = cx + autoDD.getBboxW() * overlappingThreshold / 2;
                double maxy = cy + autoDD.getBboxH() * overlappingThreshold / 2;
                Iterable<Entry<RTreeData, Rectangle>> neighbors =
                        Rtrees.get(i - 1)
                                .search(Geometries.rectangle(minx, miny, maxx, maxy))
                                .toBlocking()
                                .toIterable();
                for (Entry<RTreeData, Rectangle> nb : neighbors) {
                    RTreeData neighborRd = nb.value();
                    double curCx =
                            autoDD.getCanvasCoordinate(
                                    i - 1,
                                    Double.valueOf(neighborRd.row.get(autoDD.getXColId())),
                                    true);
                    double curCy =
                            autoDD.getCanvasCoordinate(
                                    i - 1,
                                    Double.valueOf(neighborRd.row.get(autoDD.getYColId())),
                                    false);
                    double curDistance = (cx - curCx) * (cx - curCx) + (cy - curCy) * (cy - curCy);
                    if (curDistance < minDistance) {
                        minDistance = curDistance;
                        nearestNeighbor = neighborRd;
                    }
                }
                mergeClusterAgg(nearestNeighbor, rd);
            }
        }
    }

    private void writeToDB() throws SQLException, ClassNotFoundException {
        // create tables
        bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String psql = "CREATE EXTENSION if not exists postgis;";
        bboxStmt.executeUpdate(psql);
        psql = "CREATE EXTENSION if not exists postgis_topology;";
        bboxStmt.executeUpdate(psql);
        for (int i = 0; i < numLevels; i++) {
            // step 0: create tables for storing bboxes
            String bboxTableName = getAutoDDBboxTableName(i);

            // drop table if exists
            String sql = "drop table if exists " + bboxTableName + ";";
            bboxStmt.executeUpdate(sql);

            // create the bbox table
            sql = "create unlogged table " + bboxTableName + " (";
            for (int j = 0; j < autoDD.getColumnNames().size(); j++)
                sql += autoDD.getColumnNames().get(j) + " text, ";
            sql +=
                    "clusterAgg text, cx double precision, cy double precision, minx double precision, miny double precision, "
                            + "maxx double precision, maxy double precision, geom geometry(polygon));";
            bboxStmt.executeUpdate(sql);
        }

        // insert samples
        for (int i = 0; i < numLevels; i++) {

            String bboxTableName = getAutoDDBboxTableName(i);
            String insertSql = "insert into " + bboxTableName + " values (";
            for (int j = 0; j < numRawColumns + 7; j++) insertSql += "?, ";
            insertSql += "ST_GeomFromText(?));";
            PreparedStatement preparedStmt =
                    DbConnector.getPreparedStatement(Config.databaseName, insertSql);
            int insertCount = 0;
            Iterable<Entry<RTreeData, Rectangle>> samples =
                    Rtrees.get(i).entries().toBlocking().toIterable();
            for (Entry<RTreeData, Rectangle> o : samples) {
                RTreeData rd = o.value();

                // raw data fields
                for (int k = 0; k < numRawColumns; k++)
                    preparedStmt.setString(k + 1, rd.row.get(k).replaceAll("\'", "\'\'"));

                // cluster agg
                preparedStmt.setString(
                        numRawColumns + 1, rd.getClusterAggString().replaceAll("\'", "\'\'"));

                // bounding box fields
                for (int k = 1; k <= 6; k++)
                    preparedStmt.setDouble(
                            numRawColumns + k + 1,
                            Double.valueOf(rd.row.get(numRawColumns + k - 1)));
                double minx = Double.valueOf(rd.row.get(numRawColumns + 2));
                double miny = Double.valueOf(rd.row.get(numRawColumns + 3));
                double maxx = Double.valueOf(rd.row.get(numRawColumns + 4));
                double maxy = Double.valueOf(rd.row.get(numRawColumns + 5));
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
    }

    private void calculateBGRP() throws SQLException, ClassNotFoundException {

        // add row number as a BGRP
        Main.getProject().addBGRP("roughN", String.valueOf(rawRows.size()));

        // add min & max weight into rendering params
        // min/max sum/count for all measure fields
        // no grouping at this point
        // TODO: more agg functions
        for (int i = 0; i < numLevels; i++) {
            String tableName = getAutoDDBboxTableName(i);
            String curAutoDDId = String.valueOf(autoDDIndex) + "_" + String.valueOf(i);

            // min count(*)
            String sql =
                    "SELECT min((clusterAgg::jsonb->>'count(*)')::float) FROM " + tableName + ";";
            long retInt =
                    Long.valueOf(
                            DbConnector.getQueryResult(Config.databaseName, sql).get(0).get(0));
            Main.getProject().addBGRP(curAutoDDId + "_count(*)_min", String.valueOf(retInt));

            // max count(*)
            sql = "SELECT max((clusterAgg::jsonb->>'count(*)')::float) FROM " + tableName + ";";
            retInt =
                    Long.valueOf(
                            DbConnector.getQueryResult(Config.databaseName, sql).get(0).get(0));
            Main.getProject().addBGRP(curAutoDDId + "_count(*)_max", String.valueOf(retInt));

            for (int j = 0; j < autoDD.getAggMeasureFields().size(); j++) {
                String curField = autoDD.getAggMeasureFields().get(j);
                if (curField.equals("*")) continue;

                // min sum(curField)
                sql =
                        "SELECT min((clusterAgg::jsonb->>'"
                                + aggKeyDelimiter
                                + "avg("
                                + curField
                                + ")')::float) FROM "
                                + tableName
                                + ";";
                double retDbl =
                        Double.valueOf(
                                DbConnector.getQueryResult(Config.databaseName, sql).get(0).get(0));
                Main.getProject()
                        .addBGRP(
                                curAutoDDId + "_avg(" + curField + ")_min", String.valueOf(retDbl));

                // max sum(curField)
                sql =
                        "SELECT max((clusterAgg::jsonb->>'"
                                + aggKeyDelimiter
                                + "avg("
                                + curField
                                + ")')::float) FROM "
                                + tableName
                                + ";";
                retDbl =
                        Double.valueOf(
                                DbConnector.getQueryResult(Config.databaseName, sql).get(0).get(0));
                Main.getProject()
                        .addBGRP(
                                curAutoDDId + "_avg(" + curField + ")_max", String.valueOf(retDbl));
            }
        }
    }

    private void cleanUp() throws SQLException {
        // commit & close connections
        bboxStmt.close();
        DbConnector.closeConnection(Config.databaseName);

        // release memory
        Rtrees = null;
        rawRows = null;
        autoDD = null;
    }

    private String getAutoDDBboxTableName(int level) {

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

    private void setInitialClusterAgg(RTreeData rd) {
        ArrayList<String> row = rd.row;
        rd.numericalAggs = new HashMap<>();
        rd.convexHull = new ArrayList<>();
        rd.topk = new ArrayList<>();

        // count(*)
        rd.numericalAggs.put("count(*)", 1.0);

        // convexHull
        double cx =
                autoDD.getCanvasCoordinate(
                        autoDD.getNumLevels(), Double.valueOf(row.get(autoDD.getXColId())), true);
        double cy =
                autoDD.getCanvasCoordinate(
                        autoDD.getNumLevels(), Double.valueOf(row.get(autoDD.getYColId())), false);
        double minx = cx - autoDD.getBboxW() / 2.0, maxx = cx + autoDD.getBboxW() / 2.0;
        double miny = cy - autoDD.getBboxH() / 2.0, maxy = cy + autoDD.getBboxH() / 2.0;
        rd.convexHull.add(new ArrayList<>(Arrays.asList(minx, miny)));
        rd.convexHull.add(new ArrayList<>(Arrays.asList(minx, maxy)));
        rd.convexHull.add(new ArrayList<>(Arrays.asList(maxx, maxy)));
        rd.convexHull.add(new ArrayList<>(Arrays.asList(maxx, miny)));

        // topk
        if (autoDD.getTopk() > 0) {
            HashMap<String, String> curMap = new HashMap<>();
            for (int i = 0; i < row.size(); i++)
                curMap.put(autoDD.getColumnNames().get(i), row.get(i));
            rd.topk.add(curMap);
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
            rd.numericalAggs.put(curDimensionStr + aggKeyDelimiter + "count(*)", 1.0);

            // calculate other stuff if current measure is not count(*)
            String curMeasureField = autoDD.getAggMeasureFields().get(i);
            if (!curMeasureField.equals("*")) {
                String curValue = row.get(autoDD.getColumnNames().indexOf(curMeasureField));
                rd.numericalAggs.put(
                        curDimensionStr + aggKeyDelimiter + "sum(" + curMeasureField + ")",
                        Double.valueOf(curValue));
                rd.numericalAggs.put(
                        curDimensionStr + aggKeyDelimiter + "avg(" + curMeasureField + ")",
                        Double.valueOf(curValue));
                /*                rd.numericalAggs.put(
                        curDimensionStr + aggKeyDelimiter + "max(" + curMeasureField + ")",
                        Double.valueOf(curValue));
                rd.numericalAggs.put(
                        curDimensionStr + aggKeyDelimiter + "min(" + curMeasureField + ")",
                        Double.valueOf(curValue));
                rd.numericalAggs.put(
                        curDimensionStr + aggKeyDelimiter + "sqrsum(" + curMeasureField + ")",
                        Double.valueOf(curValue) * Double.valueOf(curValue));*/
            }
        }
    }

    // this function assumes that convexHull of child
    // is from one level lower than parent
    private void mergeClusterAgg(RTreeData parent, RTreeData child) {

        // initialize parents
        if (parent.numericalAggs == null) parent.numericalAggs = new HashMap<>();
        if (parent.convexHull == null) parent.convexHull = new ArrayList<>();
        if (parent.topk == null) parent.topk = new ArrayList<>();

        // count(*)
        if (!parent.numericalAggs.containsKey("count(*)"))
            parent.numericalAggs.put("count(*)", child.numericalAggs.get("count(*)"));
        else {
            double parentCount = parent.numericalAggs.get("count(*)");
            double childCount = child.numericalAggs.get("count(*)");
            parent.numericalAggs.put("count(*)", parentCount + childCount);
        }

        // convexHull
        ArrayList<ArrayList<Double>> childConvexHull = new ArrayList<>();
        for (int i = 0; i < child.convexHull.size(); i++) {
            childConvexHull.add(new ArrayList<>());
            for (int j = 0; j < 2; j++)
                childConvexHull.get(i).add(child.convexHull.get(i).get(j) / autoDD.getZoomFactor());
        }

        if (parent.convexHull.size() == 0) parent.convexHull = childConvexHull;
        else parent.convexHull = mergeConvex(parent.convexHull, childConvexHull);

        String zCol = autoDD.getzCol();
        String zOrder = autoDD.getzOrder();
        int topk = autoDD.getTopk();

        // topk
        if (parent.topk.size() == 0) parent.topk = child.topk;
        else {
            ArrayList<HashMap<String, String>> parentTopk = parent.topk;
            ArrayList<HashMap<String, String>> childTopk = child.topk;
            ArrayList<HashMap<String, String>> mergedTopk = new ArrayList<>();
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
            parent.topk = mergedTopk;
        }

        // numeric aggregations
        for (String aggKey : child.numericalAggs.keySet()) {
            if (aggKey.equals("count(*)") || aggKey.equals("convexHull") || aggKey.equals("topk"))
                continue;
            if (!parent.numericalAggs.containsKey(aggKey))
                parent.numericalAggs.put(aggKey, child.numericalAggs.get(aggKey));
            else {
                String curFunc =
                        aggKey.substring(
                                aggKey.lastIndexOf(aggKeyDelimiter) + aggKeyDelimiter.length(),
                                aggKey.lastIndexOf("("));
                double parentValue = parent.numericalAggs.get(aggKey);
                double childValue = child.numericalAggs.get(aggKey);
                switch (curFunc) {
                    case "count":
                    case "sum":
                    case "sqrsum":
                        parent.numericalAggs.put(aggKey, parentValue + childValue);
                        break;
                    case "avg":
                        String countKey =
                                aggKey.substring(0, aggKey.lastIndexOf("avg")) + "count(*)";
                        double parentCount = parent.numericalAggs.get(countKey);
                        double childCount = child.numericalAggs.get(countKey);
                        parent.numericalAggs.put(
                                aggKey,
                                (parentValue * parentCount + childValue * childCount)
                                        / (parentCount + childCount));
                        break;
                    case "min":
                        parent.numericalAggs.put(aggKey, Math.min(parentValue, childValue));
                        break;
                    case "max":
                        parent.numericalAggs.put(aggKey, Math.max(parentValue, childValue));
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
