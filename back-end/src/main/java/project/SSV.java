package project;

import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import main.Config;
import main.DbConnector;

/** Created by wenbo on 3/31/19. */
public class SSV {

    private String query, db, rawTable;
    private String xCol, yCol, zCol;
    private int bboxW, bboxH;
    private int topk;
    private String clusterMode, zOrder;
    private ArrayList<String> columnNames, queriedColumnNames = null, columnTypes = null;
    private ArrayList<String> aggDimensionFields, aggMeasureFields, aggMeasureFuncs;
    private int numLevels, topLevelWidth, topLevelHeight;
    private double overlap;
    private double zoomFactor;
    private int xColId = -1, yColId = -1, zColId = -1;
    private double loX = Double.NaN, loY, hiX, hiY;
    private String mergeClusterAggs,
            getCitusSpatialHashKeyBody,
            singleNodeClusteringBody,
            mergeClustersAlongSplitsBody;

    public String getQuery() {
        return query;
    }

    public String getDb() {
        return db;
    }

    public String getxCol() {
        return xCol;
    }

    public String getyCol() {
        return yCol;
    }

    public int getBboxW() {
        return bboxW;
    }

    public int getBboxH() {
        return bboxH;
    }

    public int getTopk() {
        return topk;
    }

    public String getRawTable() {
        return rawTable;
    }

    public String getzCol() {
        return zCol;
    }

    public String getzOrder() {
        return zOrder;
    }

    public String getClusterMode() {
        return clusterMode;
    }

    public double getOverlap() {
        return overlap;
    }

    public int getXColId() throws Exception {

        if (xColId < 0) {
            ArrayList<String> colNames = getColumnNames();
            xColId = colNames.indexOf(xCol);
        }
        return xColId;
    }

    public int getYColId() throws Exception {

        if (yColId < 0) {
            ArrayList<String> colNames = getColumnNames();
            yColId = colNames.indexOf(yCol);
        }
        return yColId;
    }

    public int getZColId() throws Exception {

        if (zColId < 0) {
            ArrayList<String> colNames = getColumnNames();
            zColId = colNames.indexOf(zCol);
        }
        return zColId;
    }

    public ArrayList<String> getColumnNames() throws Exception {

        // if it is specified already, return
        if (columnNames.size() > 0) return columnNames;

        // otherwise fetch the schema from DB
        if (queriedColumnNames == null) {
            queriedColumnNames = new ArrayList<>();
            columnTypes = new ArrayList<>();
            Statement rawDBStmt = DbConnector.getStmtByDbName(getDb(), true);
            String query = getQuery();
            if (Config.database == Config.Database.CITUS) {
                while (query.charAt(query.length() - 1) == ';')
                    query = query.substring(0, query.length() - 1);
                // assuming there is no limit 1
                query += " LIMIT 1;";
            }
            ResultSet rs = DbConnector.getQueryResultIterator(rawDBStmt, query);
            int colCount = rs.getMetaData().getColumnCount();
            for (int i = 1; i <= colCount; i++) {
                queriedColumnNames.add(rs.getMetaData().getColumnName(i));
                columnTypes.add(rs.getMetaData().getColumnTypeName(i));
            }
            rs.close();
            rawDBStmt.close();
            DbConnector.closeConnection(getDb());
        }

        return queriedColumnNames;
    }

    public ArrayList<String> getColumnTypes() throws Exception {
        if (columnTypes != null) return columnTypes;
        getColumnNames();
        return columnTypes;
    }

    public ArrayList<String> getAggDimensionFields() {
        return aggDimensionFields;
    }

    public ArrayList<String> getAggMeasureFields() {
        return aggMeasureFields;
    }

    public ArrayList<String> getAggMeasureFuncs() {
        return aggMeasureFuncs;
    }

    public int getNumLevels() {
        return numLevels;
    }

    public int getTopLevelWidth() {
        return topLevelWidth;
    }

    public int getTopLevelHeight() {
        return topLevelHeight;
    }

    public double getZoomFactor() {
        return zoomFactor;
    }

    public double getLoX() {
        return loX;
    }

    public double getLoY() {
        return loY;
    }

    public double getHiX() {
        return hiX;
    }

    public double getHiY() {
        return hiY;
    }

    public String getMergeClusterAggs() {
        return mergeClusterAggs;
    }

    public String getGetCitusSpatialHashKeyBody() {
        return getCitusSpatialHashKeyBody;
    }

    public String getSingleNodeClusteringBody() {
        return singleNodeClusteringBody;
    }

    public String getMergeClustersAlongSplitsBody() {
        return mergeClustersAlongSplitsBody;
    }

    // get the canvas coordinate of a raw value
    public double getCanvasCoordinate(int level, double v, boolean isX) throws Exception {

        setXYExtent();
        if (isX)
            return ((topLevelWidth - bboxW) * (v - loX) / (hiX - loX) + bboxW / 2.0)
                    * Math.pow(zoomFactor, level);
        else
            return ((topLevelHeight - bboxH) * (v - loY) / (hiY - loY) + bboxH / 2.0)
                    * Math.pow(zoomFactor, level);
    }

    public void setXYExtent() throws Exception {
        // calculate range if have not
        if (Double.isNaN(loX)) {

            System.out.println("\n Calculating SSV x & y ranges...\n");
            loX = loY = Double.MAX_VALUE;
            hiX = hiY = Double.MIN_VALUE;
            Statement rawDBStmt = DbConnector.getStmtByDbName(getDb(), true);
            ResultSet rs = DbConnector.getQueryResultIterator(rawDBStmt, getQuery());
            while (rs.next()) {
                double cx = rs.getDouble(getXColId() + 1);
                double cy = rs.getDouble(getYColId() + 1);
                loX = Math.min(loX, cx);
                hiX = Math.max(hiX, cx);
                loY = Math.min(loY, cy);
                hiY = Math.max(hiY, cy);
            }
            rawDBStmt.close();
            DbConnector.closeConnection(getDb());
        }
    }

    @Override
    public String toString() {
        return "SSV{"
                + "query='"
                + query
                + '\''
                + ", db='"
                + db
                + '\''
                + ", xCol='"
                + xCol
                + '\''
                + ", yCol='"
                + yCol
                + '\''
                + ", bboxW="
                + bboxW
                + ", bboxH="
                + bboxH
                + '\''
                + ", clusterMode='"
                + clusterMode
                + '\''
                + ", columnNames="
                + columnNames
                + ", numLevels="
                + numLevels
                + ", topLevelWidth="
                + topLevelWidth
                + ", topLevelHeight="
                + topLevelHeight
                + ", overlap="
                + overlap
                + ", zoomFactor="
                + zoomFactor
                + '}';
    }
}
