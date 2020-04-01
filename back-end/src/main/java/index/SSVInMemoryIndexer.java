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
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Locale;
import main.Config;
import main.DbConnector;
import main.Main;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import project.Canvas;
import project.SSV;
import vlsi.utils.CompactHashMap;

/** Created by wenbo on 5/6/19. */
public class SSVInMemoryIndexer extends PsqlNativeBoxIndexer {

    private class RTreeData {
        int rowId;
        float minx, miny, maxx, maxy;
        CompactHashMap<String, Float> numericalAggs;
        float[][] convexHull;
        int[] topk;

        RTreeData(int _rowId) {
            rowId = _rowId;
            minx = miny = maxx = maxy = 0;
            numericalAggs = null;
            convexHull = null;
            topk = null;
        }

        public RTreeData clone() {
            RTreeData ret = new RTreeData(rowId);
            if (numericalAggs != null) {
                ret.numericalAggs = new CompactHashMap<>();
                for (String key : numericalAggs.keySet())
                    ret.numericalAggs.put(key, numericalAggs.get(key));
            }
            if (convexHull != null) {
                ret.convexHull = new float[convexHull.length][2];
                for (int i = 0; i < convexHull.length; i++) {
                    ret.convexHull[i][0] = convexHull[i][0];
                    ret.convexHull[i][1] = convexHull[i][1];
                }
            }
            if (topk != null) {
                ret.topk = new int[topk.length];
                for (int i = 0; i < topk.length; i++) ret.topk[i] = topk[i];
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
            for (int i = 0; i < convexHull.length; i++) {
                JsonArray arr = new JsonArray();
                arr.add(convexHull[i][0]);
                arr.add(convexHull[i][1]);
                convexHullArr.add(arr);
            }
            jsonObj.add("convexHull", convexHullArr);

            // turn topk into an array of json objects
            JsonArray topkArr = new JsonArray();
            for (int i = 0; i < topk.length; i++) {
                JsonObject obj = new JsonObject();
                ArrayList<String> curRow = rawRows.get(topk[i]);
                for (int j = 0; j < numRawColumns; j++)
                    obj.addProperty(ssv.getColumnNames().get(j), curRow.get(j));
                topkArr.add(obj);
            }
            jsonObj.add("topk", topkArr);

            return gson.toJson(jsonObj);
        }
    }

    public class SortByZ implements Comparator<RTreeData> {

        @Override
        public int compare(RTreeData o1, RTreeData o2) {

            String zCol = ssv.getzCol();
            int zColId = ssv.getColumnNames().indexOf(zCol);
            String zOrder = ssv.getzOrder();

            float v1 = parseFloat(rawRows.get(o1.rowId).get(zColId));
            float v2 = parseFloat(rawRows.get(o2.rowId).get(zColId));
            if (v1 == v2) return 0;
            if (zOrder.equals("asc")) return v1 < v2 ? -1 : 1;
            else return v1 < v2 ? 1 : -1;
        }
    }

    private static SSVInMemoryIndexer instance = null;
    private final int objectNumLimit = 4000; // in a 1k by 1k region
    private final int virtualViewportSize = 1000;
    private double overlappingThreshold = 1.0;
    private final String aggKeyDelimiter = "__";
    private final Gson gson;
    private String rpKey;
    private int ssvIndex, numLevels, numRawColumns;
    private Statement bboxStmt;

    // One Rtree per level to store clusters
    // https://github.com/davidmoten/rtree
    private RTree<RTreeData, Rectangle> rtree0, rtree1;
    private ArrayList<ArrayList<String>> rawRows;
    private SSV ssv;

    // singleton pattern to ensure only one instance existed
    private SSVInMemoryIndexer() {
        gson = new GsonBuilder().create();
    }

    // thread-safe instance getter
    public static synchronized SSVInMemoryIndexer getInstance() {

        if (instance == null) instance = new SSVInMemoryIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        // create MV for all ssv layers at once
        String curSSVId = c.getLayers().get(layerId).getSSVId();
        int levelId = Integer.valueOf(curSSVId.substring(curSSVId.indexOf("_") + 1));
        if (levelId > 0) return;
        ssvIndex = Integer.valueOf(curSSVId.substring(0, curSSVId.indexOf("_")));
        rpKey = "ssv_" + String.valueOf(ssvIndex);

        // set common variables
        setCommonVariables();

        // compute cluster aggregations
        long st = System.nanoTime();
        computeClusterAggs();
        System.out.println("Computer ClusterAggs took " + (System.nanoTime() - st) / 1e9 + "s.");

        // clean up
        cleanUp();
    }

    private void setCommonVariables() throws SQLException, ClassNotFoundException {
        // get current SSV object
        ssv = Main.getProject().getSsvs().get(ssvIndex);
        numLevels = ssv.getNumLevels();
        numRawColumns = ssv.getColumnNames().size();

        System.out.println("aggDimensionFields: " + ssv.getAggDimensionFields());
        System.out.println("aggMeasureFields: " + ssv.getAggMeasureFields());
        System.out.println("aggMeasureFuncs: " + ssv.getAggMeasureFuncs());

        // calculate overlapping threshold
        overlappingThreshold =
                Math.max(
                        0.2,
                        Math.sqrt(
                                        4
                                                * (virtualViewportSize + ssv.getBboxW() * 2)
                                                * (virtualViewportSize + ssv.getBboxH() * 2)
                                                / objectNumLimit
                                                / ssv.getBboxH()
                                                / ssv.getBboxW())
                                - 1);
        overlappingThreshold = Math.max(overlappingThreshold, ssv.getOverlap());
        System.out.println("Overlapping threshold: " + overlappingThreshold);

        // store raw query results into memory
        rawRows = DbConnector.getQueryResult(ssv.getDb(), ssv.getQuery());
        for (int i = 0; i < rawRows.size(); i++)
            for (int j = 0; j < numRawColumns; j++)
                if (rawRows.get(i).get(j) == null) rawRows.get(i).set(j, "");

        // add row number as a BGRP
        Main.getProject().addBGRP(rpKey, "roughN", String.valueOf(rawRows.size()));
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
        for (int i = numLevels; i >= 0; i--) {
            //            Main.printUsedMemory("Memory consumed before clustering level" + i);
            System.out.println("merging level " + i + "...");

            // all clusters from this level
            Iterable<Entry<RTreeData, Rectangle>> curClustersIterable =
                    rtree0.entries().toBlocking().toIterable();
            RTreeData[] curClusters = new RTreeData[rtree0.size()];
            int idx = 0;
            for (Entry<RTreeData, Rectangle> o : curClustersIterable)
                curClusters[idx++] = o.value();

            // add BGRP
            calculateBGRP(curClusters, i);

            if (i == 0) break;

            // only sort for custom
            if (ssv.getClusterMode().equals("custom")) Arrays.sort(curClusters, new SortByZ());

            // an Rtree for merged clusters
            rtree1 = RTree.star().create();

            // linear scan -- merge or insert
            for (RTreeData rd : curClusters) {
                // find its nearest neighbor in the merged clusters
                double cx =
                        ssv.getCanvasCoordinate(
                                i - 1,
                                parseFloat(rawRows.get(rd.rowId).get(ssv.getXColId())),
                                true);
                double cy =
                        ssv.getCanvasCoordinate(
                                i - 1,
                                parseFloat(rawRows.get(rd.rowId).get(ssv.getYColId())),
                                false);
                double minx = cx - ssv.getBboxW() * overlappingThreshold / 2;
                double miny = cy - ssv.getBboxH() * overlappingThreshold / 2;
                double maxx = cx + ssv.getBboxW() * overlappingThreshold / 2;
                double maxy = cy + ssv.getBboxH() * overlappingThreshold / 2;
                Iterable<Entry<RTreeData, Rectangle>> neighbors =
                        rtree1.search(Geometries.rectangle(minx, miny, maxx, maxy))
                                .toBlocking()
                                .toIterable();
                double minDistance = Double.MAX_VALUE;
                RTreeData nearestNeighbor = null;
                for (Entry<RTreeData, Rectangle> nb : neighbors) {
                    RTreeData neighborRd = nb.value();
                    double curCx =
                            ssv.getCanvasCoordinate(
                                    i - 1,
                                    parseFloat(rawRows.get(neighborRd.rowId).get(ssv.getXColId())),
                                    true);
                    double curCy =
                            ssv.getCanvasCoordinate(
                                    i - 1,
                                    parseFloat(rawRows.get(neighborRd.rowId).get(ssv.getYColId())),
                                    false);
                    double curDistance =
                            Math.max(
                                    Math.abs(curCx - cx) / ssv.getBboxW(),
                                    Math.abs(curCy - cy) / ssv.getBboxH());
                    if (curDistance < minDistance) {
                        minDistance = curDistance;
                        nearestNeighbor = neighborRd;
                    }
                }
                if (nearestNeighbor == null) {
                    RTreeData rdClone = rd.clone();
                    // scale the convex hulls
                    for (int p = 0; p < rdClone.convexHull.length; p++)
                        for (int k = 0; k < 2; k++) rdClone.convexHull[p][k] /= ssv.getZoomFactor();

                    // add bbox coordinates
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

            //            Main.printUsedMemory("Memory consumed after clustering level" + i);
        }
    }

    private void writeToDB(int level) throws SQLException, ClassNotFoundException {
        // create tables
        bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);

        // step 0: create tables for storing bboxes
        String bboxTableName = getSSVBboxTableName(level);

        // drop table if exists
        String sql = "drop table if exists " + bboxTableName + ";";
        bboxStmt.executeUpdate(sql);

        // create the bbox table
        sql = "create unlogged table " + bboxTableName + " (";
        for (int j = 0; j < ssv.getColumnNames().size(); j++)
            sql += ssv.getColumnNames().get(j) + " text, ";
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
            preparedStmt.setDouble(numRawColumns + 2, (rd.minx + rd.maxx) / 2.0);
            preparedStmt.setDouble(numRawColumns + 3, (rd.miny + rd.maxy) / 2.0);
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

    private void calculateBGRP(RTreeData[] rds, int level)
            throws SQLException, ClassNotFoundException {

        // add min & max weight into rendering params
        // min/max sum/count for all measure fields
        // only for circle, heatmap & contour right now
        // no grouping needed at this point
        if (!ssv.getClusterMode().equals("circle")
                && !ssv.getClusterMode().equals("contour")
                && !ssv.getClusterMode().equals("heatmap")) return;

        String curSSVId = String.valueOf(ssvIndex) + "_" + String.valueOf(level);
        for (int i = 0; i < ssv.getAggMeasureFields().size(); i++) {
            String curField = ssv.getAggMeasureFields().get(i);
            String curFunction = ssv.getAggMeasureFuncs().get(i);

            // min
            float minAgg = Float.MAX_VALUE;
            float maxAgg = Float.MIN_VALUE;
            for (RTreeData rd : rds) {
                minAgg = Math.min(minAgg, rd.numericalAggs.get(curFunction + "(" + curField + ")"));
                maxAgg = Math.max(maxAgg, rd.numericalAggs.get(curFunction + "(" + curField + ")"));
            }

            Main.getProject()
                    .addBGRP(
                            rpKey,
                            curSSVId + "_" + curFunction + "(" + curField + ")_min",
                            String.valueOf(minAgg));

            Main.getProject()
                    .addBGRP(
                            rpKey,
                            curSSVId + "_" + curFunction + "(" + curField + ")_max",
                            String.valueOf(maxAgg));
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
        ssv = null;
    }

    private String getSSVBboxTableName(int level) {

        String ssvId = String.valueOf(ssvIndex) + "_" + String.valueOf(level);
        for (Canvas c : Main.getProject().getCanvases()) {
            int numLayers = c.getLayers().size();
            for (int layerId = 0; layerId < numLayers; layerId++) {
                if (c.getLayers().get(layerId).isStatic()) continue;
                String curSSVId = c.getLayers().get(layerId).getSSVId();
                if (curSSVId == null) continue;
                if (curSSVId.equals(ssvId))
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

        // convexHull
        double cx =
                ssv.getCanvasCoordinate(
                        ssv.getNumLevels(), parseFloat(row.get(ssv.getXColId())), true);
        double cy =
                ssv.getCanvasCoordinate(
                        ssv.getNumLevels(), parseFloat(row.get(ssv.getYColId())), false);

        float minx = (float) (cx - ssv.getBboxW() / 2.0),
                maxx = (float) (cx + ssv.getBboxW() / 2.0);
        float miny = (float) (cy - ssv.getBboxH() / 2.0),
                maxy = (float) (cy + ssv.getBboxH() / 2.0);
        float[][] convexHullCopy = {{minx, miny}, {minx, maxy}, {maxx, maxy}, {maxx, miny}};
        rd.convexHull = convexHullCopy;

        // topk
        if (ssv.getTopk() > 0) {
            rd.topk = new int[1];
            rd.topk[0] = rd.rowId;
        } else rd.topk = new int[0];

        // numeric aggregations
        rd.numericalAggs = new CompactHashMap<>();
        String curDimensionStr = "";
        for (String dimension : ssv.getAggDimensionFields()) {
            if (curDimensionStr.length() > 0) curDimensionStr += aggKeyDelimiter;
            curDimensionStr += row.get(ssv.getColumnNames().indexOf(dimension));
        }

        int numMeasures = ssv.getAggMeasureFields().size();
        for (int i = 0; i < numMeasures; i++) {
            String curMeasureField = ssv.getAggMeasureFields().get(i);
            String curMeasureFunction = ssv.getAggMeasureFuncs().get(i);
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
                            : parseFloat(row.get(ssv.getColumnNames().indexOf(curMeasureField))));

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

        // convexHull
        float[][] childConvexHull = new float[child.convexHull.length][2];
        for (int i = 0; i < child.convexHull.length; i++)
            for (int j = 0; j < 2; j++)
                childConvexHull[i][j] = child.convexHull[i][j] / (float) ssv.getZoomFactor();

        if (parent.convexHull.length == 0) parent.convexHull = childConvexHull;
        else parent.convexHull = mergeConvex(parent.convexHull, childConvexHull);

        String zCol = ssv.getzCol();
        int zColId = ssv.getColumnNames().indexOf(zCol);
        String zOrder = ssv.getzOrder();

        // topk
        if (ssv.getTopk() > 0) {
            int[] parentTopk = parent.topk;
            int[] childTopk = child.topk;
            int[] mergedTopk =
                    new int[Math.min(parentTopk.length + childTopk.length, ssv.getTopk())];
            int parentIter = 0, childIter = 0, mergedIter = 0;
            while ((parentIter < parentTopk.length || childIter < childTopk.length)
                    && mergedIter < mergedTopk.length) {
                if (parentIter >= parentTopk.length)
                    mergedTopk[mergedIter++] = childTopk[childIter++];
                else if (childIter >= childTopk.length)
                    mergedTopk[mergedIter++] = parentTopk[parentIter++];
                else {
                    int parentHead = parentTopk[parentIter];
                    int childHead = childTopk[childIter];
                    double parentValue = parseFloat(rawRows.get(parentHead).get(zColId));
                    double childValue = parseFloat(rawRows.get(childHead).get(zColId));
                    if ((parentValue <= childValue && zOrder.equals("asc"))
                            || (parentValue >= childValue && zOrder.equals("desc"))) {
                        mergedTopk[mergedIter++] = parentHead;
                        parentIter++;
                    } else {
                        mergedTopk[mergedIter++] = childHead;
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

    private float[][] mergeConvex(float[][] parent, float[][] child) {
        Geometry parentGeom = getGeometryFromFloatArray(parent);
        Geometry childGeom = getGeometryFromFloatArray(child);
        Geometry union = parentGeom.union(childGeom);
        return getCoordsListOfGeometry(union.convexHull());
    }

    private Geometry getGeometryFromFloatArray(float[][] coords) {
        GeometryFactory gf = new GeometryFactory();
        ArrayList<Point> points = new ArrayList<>();
        for (int i = 0; i < coords.length; i++) {
            float x = coords[i][0];
            float y = coords[i][1];
            points.add(gf.createPoint(new Coordinate(x, y)));
        }
        Geometry geom = gf.createMultiPoint(GeometryFactory.toPointArray(points));
        return geom;
    }

    private float[][] getCoordsListOfGeometry(Geometry geometry) {
        Coordinate[] coordinates = geometry.getCoordinates();
        float[][] coordsList = new float[coordinates.length][2];
        for (int i = 0; i < coordinates.length; i++) {
            coordsList[i][0] = (float) coordinates[i].x;
            coordsList[i][1] = (float) coordinates[i].y;
        }
        return coordsList;
    }

    private float parseFloat(String s) {
        NumberFormat nf = NumberFormat.getInstance(Locale.US);
        try {
            return nf.parse(s).floatValue();
        } catch (Exception e) {
            return 0;
        }
    }
}
