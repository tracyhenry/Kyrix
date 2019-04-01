package project;

import java.util.ArrayList;

/**
 * Created by wenbo on 3/31/19.
 */
public class AutoDD {

    private String query, db;
    private String xCol, yCol;
    private int bboxW, bboxH;
    private String rendering;
    private ArrayList<String> columnNames;
    private int numLevels, topLevelWidth, topLevelHeight, zoomFactor;

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

    public String getRendering() {
        return rendering;
    }

    public ArrayList<String> getColumnNames() {
        return columnNames;
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

    public int getZoomFactor() {
        return zoomFactor;
    }

    @Override
    public String toString() {
        return "AutoDD{" +
                "query='" + query + '\'' +
                ", db='" + db + '\'' +
                ", xCol='" + xCol + '\'' +
                ", yCol='" + yCol + '\'' +
                ", bboxW=" + bboxW +
                ", bboxH=" + bboxH +
                ", rendering='" + rendering + '\'' +
                ", columnNames=" + columnNames +
                ", numLevels=" + numLevels +
                ", topLevelWidth=" + topLevelWidth +
                ", topLevelHeight=" + topLevelHeight +
                ", zoomFactor=" + zoomFactor +
                '}';
    }
}
