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
public class AutoDDInMemoryIndexer extends PsqlNativeBoxIndexer {

    private class RTreeData {
        int rowId;
        float cx, cy, minx, miny, maxx, maxy;
        HashMap<String, Float> numericalAggs;
        ArrayList<ArrayList<Float>> convexHull;
        ArrayList<Integer> topk;

        RTreeData(int _rowId) {
            rowId = _rowId;
            cx = cy = minx = miny = maxx = maxy = 0;
            numericalAggs = null;
            convexHull = null;
            topk = null;
        }

        public RTreeData clone() {
            RTreeData ret = new RTreeData(rowId);
            if (numericalAggs != null) {
                ret.numericalAggs = new HashMap<>();
                for (String key : numericalAggs.keySet())
                    ret.numericalAggs.put(key, numericalAggs.get(key));
            }
            if (convexHull != null) {
                ret.convexHull = new ArrayList<>();
                for (int i = 0; i < convexHull.size(); i++)
                    ret.convexHull.add(
                            new ArrayList<>(
                                    Arrays.asList(
                                            convexHull.get(i).get(0), convexHull.get(i).get(1))));
            }
            if (topk != null) {
                ret.topk = new ArrayList<>();
                for (int i = 0; i < topk.size(); i++) ret.topk.add(topk.get(i));
            }
            return ret;
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
                ArrayList<String> curRow = rawRows.get(topk.get(i));
                for (int j = 0; j < numRawColumns; j++)
                    obj.addProperty(autoDD.getColumnNames().get(j), curRow.get(j));
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

    // One Rtree per level to store clusters
    // https://github.com/davidmoten/rtree
    private RTree<RTreeData, Rectangle> rtree0, rtree1;
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

        // compute cluster aggregations
        long st = System.nanoTime();
        computeClusterAggs();
        System.out.println("Computer ClusterAggs took " + (System.nanoTime() - st) / 1e9 + "s.");

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
        System.out.println("aggMeasureFuncs: " + autoDD.getAggMeasureFuncs());

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

    private void computeClusterAggs() throws SQLException, ClassNotFoundException {

        // initialize R-tree0
        rtree0 = RTree.star().create();
        for (int i = 0; i < rawRows.size(); i++) {
            RTreeData rd = new RTreeData(i);
            setInitialClusterAgg(rd);
            rtree0 = rtree0.add(rd, Geometries.rectangle(0f, 0f, 0f, 0f));
        }

        // bottom-up clustering
        for (int i = numLevels; i > 0; i--) {
            System.out.println("merging level " + i + "...");
            // all clusters from this level
            Iterable<Entry<RTreeData, Rectangle>> curClusters =
                    rtree0.entries().toBlocking().toIterable();

            // an Rtree for merged clusters
            rtree1 = RTree.star().create();

            // linear scan -- merge or insert
            for (Entry<RTreeData, Rectangle> o : curClusters) {
                RTreeData rd = o.value();

                // find its nearest neighbor in the merged clusters
                double cx =
                        autoDD.getCanvasCoordinate(
                                i - 1,
                                Double.valueOf(rawRows.get(rd.rowId).get(autoDD.getXColId())),
                                true);
                double cy =
                        autoDD.getCanvasCoordinate(
                                i - 1,
                                Double.valueOf(rawRows.get(rd.rowId).get(autoDD.getYColId())),
                                false);
                double minx = cx - autoDD.getBboxW() * overlappingThreshold / 2;
                double miny = cy - autoDD.getBboxH() * overlappingThreshold / 2;
                double maxx = cx + autoDD.getBboxW() * overlappingThreshold / 2;
                double maxy = cy + autoDD.getBboxH() * overlappingThreshold / 2;
                Iterable<Entry<RTreeData, Rectangle>> neighbors =
                        rtree1.search(Geometries.rectangle(minx, miny, maxx, maxy))
                                .toBlocking()
                                .toIterable();
                double minDistance = Double.MAX_VALUE;
                RTreeData nearestNeighbor = null;
                for (Entry<RTreeData, Rectangle> nb : neighbors) {
                    RTreeData neighborRd = nb.value();
                    double curCx =
                            autoDD.getCanvasCoordinate(
                                    i - 1,
                                    Double.valueOf(
                                            rawRows.get(neighborRd.rowId).get(autoDD.getXColId())),
                                    true);
                    double curCy =
                            autoDD.getCanvasCoordinate(
                                    i - 1,
                                    Double.valueOf(
                                            rawRows.get(neighborRd.rowId).get(autoDD.getYColId())),
                                    false);
                    double curDistance =
                            Math.max(
                                    Math.abs(curCx - cx) / autoDD.getBboxW(),
                                    Math.abs(curCy - cy) / autoDD.getBboxH());
                    if (curDistance < minDistance) {
                        minDistance = curDistance;
                        nearestNeighbor = neighborRd;
                    }
                }
                if (nearestNeighbor == null) {
                    RTreeData rdClone = rd.clone();
                    // scale the convex hulls
                    for (int j = 0; j < rdClone.convexHull.size(); j++)
                        for (int k = 0; k < 2; k++)
                            rdClone.convexHull
                                    .get(j)
                                    .set(
                                            k,
                                            rd.convexHull.get(j).get(k)
                                                    / (float) autoDD.getZoomFactor());

                    // add bbox coordinates
                    rdClone.cx = (float) cx;
                    rdClone.cy = (float) cy;
                    rdClone.minx = (float) minx;
                    rdClone.miny = (float) miny;
                    rdClone.maxx = (float) maxx;
                    rdClone.maxy = (float) maxy;

                    // add it to current level
                    rtree1 =
                            rtree1.add(
                                    rdClone,
                                    Geometries.rectangle(
                                            (float) minx,
                                            (float) miny,
                                            (float) maxx,
                                            (float) maxy));
                } else mergeClusterAgg(nearestNeighbor, rd);
            }

            // assign rtree1 to rtree0
            rtree0 = null;
            rtree0 = rtree1;

            // write current level to db
            System.out.println("merging done. writing to db....");
            writeToDB(i - 1);
            System.out.println("finished writing to db...");
        }
    }

    private void writeToDB(int level) throws SQLException, ClassNotFoundException {
        // create tables
        bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);

        // step 0: create tables for storing bboxes
        String bboxTableName = getAutoDDBboxTableName(level);

        // drop table if exists
        String sql = "drop table if exists " + bboxTableName + ";";
        bboxStmt.executeUpdate(sql);

        // create the bbox table
        sql = "create unlogged table " + bboxTableName + " (";
        for (int j = 0; j < autoDD.getColumnNames().size(); j++)
            sql += autoDD.getColumnNames().get(j) + " text, ";
        sql +=
                "clusterAgg text, cx double precision, cy double precision, minx double precision, miny double precision, "
                        + "maxx double precision, maxy double precision, geom box);";
        bboxStmt.executeUpdate(sql);

        // insert clusters
        String insertSql = "insert into " + bboxTableName + " values (";
        for (int j = 0; j < numRawColumns + 6; j++) insertSql += "?, ";
        insertSql += "?);";
        PreparedStatement preparedStmt =
                DbConnector.getPreparedStatement(Config.databaseName, insertSql);
        int insertCount = 0;
        Iterable<Entry<RTreeData, Rectangle>> clusters = rtree1.entries().toBlocking().toIterable();
        for (Entry<RTreeData, Rectangle> o : clusters) {
            RTreeData rd = o.value();

            // raw data fields
            for (int k = 0; k < numRawColumns; k++)
                preparedStmt.setString(
                        k + 1, rawRows.get(rd.rowId).get(k).replaceAll("\'", "\'\'"));

            // cluster agg
            preparedStmt.setString(
                    numRawColumns + 1, rd.getClusterAggString().replaceAll("\'", "\'\'"));

            // bounding box fields
            preparedStmt.setDouble(numRawColumns + 2, rd.cx);
            preparedStmt.setDouble(numRawColumns + 3, rd.cy);
            preparedStmt.setDouble(numRawColumns + 4, rd.minx);
            preparedStmt.setDouble(numRawColumns + 5, rd.miny);
            preparedStmt.setDouble(numRawColumns + 6, rd.maxx);
            preparedStmt.setDouble(numRawColumns + 7, rd.maxy);

            // batch commit
            preparedStmt.addBatch();
            insertCount++;
            if ((insertCount + 1) % Config.bboxBatchSize == 0) preparedStmt.executeBatch();
        }
        preparedStmt.executeBatch();
        preparedStmt.close();

        // update box
        sql = "UPDATE " + bboxTableName + " SET geom=box( point(minx,miny), point(maxx,maxy) );";
        bboxStmt.executeUpdate(sql);

        // build spatial index
        sql = "create index sp_" + bboxTableName + " on " + bboxTableName + " using gist (geom);";
        bboxStmt.executeUpdate(sql);
        sql = "cluster " + bboxTableName + " using sp_" + bboxTableName + ";";
        bboxStmt.executeUpdate(sql);
    }

    private void calculateBGRP() throws SQLException, ClassNotFoundException {

        // add row number as a BGRP
        Main.getProject().addBGRP("roughN", String.valueOf(rawRows.size()));

        // add min & max weight into rendering params
        // min/max sum/count for all measure fields
        // only for circle, heatmap & contour right now
        // no grouping needed at this point
        if (!autoDD.getClusterMode().equals("circle")
                && !autoDD.getClusterMode().equals("contour")
                && !autoDD.getClusterMode().equals("heatmap")) return;

        for (int i = 0; i < numLevels; i++) {
            String tableName = getAutoDDBboxTableName(i);
            String curAutoDDId = String.valueOf(autoDDIndex) + "_" + String.valueOf(i);

            for (int j = 0; j < autoDD.getAggMeasureFields().size(); j++) {
                String curField = autoDD.getAggMeasureFields().get(j);
                String curFunction = autoDD.getAggMeasureFuncs().get(j);

                // min curFunction(curField)
                String sql =
                        "SELECT min((clusterAgg::jsonb->>'"
                                + curFunction
                                + "("
                                + curField
                                + ")')::float) FROM "
                                + tableName
                                + ";";
                double retDbl =
                        Double.valueOf(
                                DbConnector.getQueryResult(Config.databaseName, sql).get(0).get(0));
                Main.getProject()
                        .addBGRP(
                                curAutoDDId + "_" + curFunction + "(" + curField + ")_min",
                                String.valueOf(retDbl));

                // max sum(curField)
                sql =
                        "SELECT max((clusterAgg::jsonb->>'"
                                + curFunction
                                + "("
                                + curField
                                + ")')::float) FROM "
                                + tableName
                                + ";";
                retDbl =
                        Double.valueOf(
                                DbConnector.getQueryResult(Config.databaseName, sql).get(0).get(0));
                Main.getProject()
                        .addBGRP(
                                curAutoDDId + "_" + curFunction + "(" + curField + ")_max",
                                String.valueOf(retDbl));
            }
        }
    }

    private void cleanUp() throws SQLException {
        // commit & close connections
        bboxStmt.close();
        DbConnector.closeConnection(Config.databaseName);

        // release memory
        rtree0 = null;
        rtree1 = null;
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
        ArrayList<String> row = rawRows.get(rd.rowId);
        rd.numericalAggs = new HashMap<>();
        rd.convexHull = new ArrayList<>();
        rd.topk = new ArrayList<>();

        // convexHull
        double cx =
                autoDD.getCanvasCoordinate(
                        autoDD.getNumLevels(), Double.valueOf(row.get(autoDD.getXColId())), true);
        double cy =
                autoDD.getCanvasCoordinate(
                        autoDD.getNumLevels(), Double.valueOf(row.get(autoDD.getYColId())), false);
        float minx = (float) (cx - autoDD.getBboxW() / 2.0),
                maxx = (float) (cx + autoDD.getBboxW() / 2.0);
        float miny = (float) (cy - autoDD.getBboxH() / 2.0),
                maxy = (float) (cy + autoDD.getBboxH() / 2.0);
        rd.convexHull.add(new ArrayList<>(Arrays.asList(minx, miny)));
        rd.convexHull.add(new ArrayList<>(Arrays.asList(minx, maxy)));
        rd.convexHull.add(new ArrayList<>(Arrays.asList(maxx, maxy)));
        rd.convexHull.add(new ArrayList<>(Arrays.asList(maxx, miny)));

        // topk
        if (autoDD.getTopk() > 0) rd.topk.add(rd.rowId);

        // numeric aggregations
        String curDimensionStr = "";
        for (String dimension : autoDD.getAggDimensionFields()) {
            if (curDimensionStr.length() > 0) curDimensionStr += aggKeyDelimiter;
            curDimensionStr += row.get(autoDD.getColumnNames().indexOf(dimension));
        }

        int numMeasures = autoDD.getAggMeasureFields().size();
        for (int i = 0; i < numMeasures; i++) {
            String curMeasureField = autoDD.getAggMeasureFields().get(i);
            String curMeasureFunction = autoDD.getAggMeasureFuncs().get(i);
            String curKey =
                    curDimensionStr
                            + (curDimensionStr.isEmpty() ? "" : aggKeyDelimiter)
                            + curMeasureFunction
                            + "("
                            + curMeasureField
                            + ")";
            float curValue =
                    (curMeasureFunction.equals("count")
                            ? 1.0f
                            : Float.valueOf(
                                    row.get(autoDD.getColumnNames().indexOf(curMeasureField))));

            if (curMeasureFunction.equals("sqrsum"))
                rd.numericalAggs.put(curKey, curValue * curValue);
            else
                // sum, avg, max, min, count
                rd.numericalAggs.put(curKey, curValue);
        }
        // add count(*) if does not exist
        if (!rd.numericalAggs.containsKey("count(*)")) rd.numericalAggs.put("count(*)", 1.0f);
    }

    // this function assumes that convexHull of child
    // is from one level lower than parent
    private void mergeClusterAgg(RTreeData parent, RTreeData child) {

        // initialize parents
        if (parent.numericalAggs == null) parent.numericalAggs = new HashMap<>();
        if (parent.convexHull == null) parent.convexHull = new ArrayList<>();
        if (parent.topk == null) parent.topk = new ArrayList<>();

        // convexHull
        ArrayList<ArrayList<Float>> childConvexHull = new ArrayList<>();
        for (int i = 0; i < child.convexHull.size(); i++) {
            childConvexHull.add(new ArrayList<>());
            for (int j = 0; j < 2; j++)
                childConvexHull
                        .get(i)
                        .add(child.convexHull.get(i).get(j) / (float) autoDD.getZoomFactor());
        }

        if (parent.convexHull.size() == 0) parent.convexHull = childConvexHull;
        else parent.convexHull = mergeConvex(parent.convexHull, childConvexHull);

        String zCol = autoDD.getzCol();
        int zColId = autoDD.getColumnNames().indexOf(zCol);
        String zOrder = autoDD.getzOrder();
        int topk = autoDD.getTopk();

        // topk
        if (parent.topk.size() == 0) parent.topk = child.topk;
        else {
            ArrayList<Integer> parentTopk = parent.topk;
            ArrayList<Integer> childTopk = child.topk;
            ArrayList<Integer> mergedTopk = new ArrayList<>();
            int parentIter = 0, childIter = 0;
            while ((parentIter < parentTopk.size() || childIter < childTopk.size())
                    && mergedTopk.size() < topk) {
                if (parentIter >= parentTopk.size()) {
                    mergedTopk.add(childTopk.get(childIter));
                    childIter++;
                } else if (childIter >= childTopk.size()) {
                    mergedTopk.add(parentTopk.get(parentIter));
                    parentIter++;
                } else {
                    int parentHead = parentTopk.get(parentIter);
                    int childHead = childTopk.get(childIter);
                    double parentValue = Double.valueOf(rawRows.get(parentHead).get(zColId));
                    double childValue = Double.valueOf(rawRows.get(childHead).get(zColId));
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
            if (aggKey.equals("convexHull") || aggKey.equals("topk")) continue;
            if (!parent.numericalAggs.containsKey(aggKey))
                parent.numericalAggs.put(aggKey, child.numericalAggs.get(aggKey));
            else {
                String curFunc =
                        aggKey.substring(
                                (aggKey.contains(aggKeyDelimiter)
                                        ? aggKey.lastIndexOf(aggKeyDelimiter)
                                                + aggKeyDelimiter.length()
                                        : 0),
                                aggKey.lastIndexOf("("));
                float parentValue = parent.numericalAggs.get(aggKey);
                float childValue = child.numericalAggs.get(aggKey);
                switch (curFunc) {
                    case "count":
                    case "sum":
                    case "sqrsum":
                        parent.numericalAggs.put(aggKey, parentValue + childValue);
                        break;
                    case "avg":
                        String countKey =
                                aggKey.substring(0, aggKey.lastIndexOf("avg")) + "count(*)";
                        float parentCount = parent.numericalAggs.get(countKey);
                        float childCount = child.numericalAggs.get(countKey);
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

    private ArrayList<ArrayList<Float>> mergeConvex(
            ArrayList<ArrayList<Float>> parent, ArrayList<ArrayList<Float>> child) {
        Geometry parentGeom = getGeometryFromFloatArray(parent);
        Geometry childGeom = getGeometryFromFloatArray(child);
        Geometry union = parentGeom.union(childGeom);
        return getCoordsListOfGeometry(union.convexHull());
    }

    private Geometry getGeometryFromFloatArray(ArrayList<ArrayList<Float>> coords) {
        GeometryFactory gf = new GeometryFactory();
        ArrayList<Point> points = new ArrayList<>();
        for (int i = 0; i < coords.size(); i++) {
            float x = coords.get(i).get(0);
            float y = coords.get(i).get(1);
            points.add(gf.createPoint(new Coordinate(x, y)));
        }
        Geometry geom = gf.createMultiPoint(GeometryFactory.toPointArray(points));
        return geom;
    }

    private ArrayList<ArrayList<Float>> getCoordsListOfGeometry(Geometry geometry) {
        Coordinate[] coordinates = geometry.getCoordinates();
        ArrayList<ArrayList<Float>> coordsList = new ArrayList<>();
        for (Coordinate coordinate : coordinates)
            coordsList.add(
                    new ArrayList<>(Arrays.asList((float) coordinate.x, (float) coordinate.y)));
        return coordsList;
    }
}
