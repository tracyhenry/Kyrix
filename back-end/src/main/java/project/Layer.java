package project;

import index.Indexer;
import java.io.Serializable;

/** Created by wenbo on 4/3/18. */
public class Layer implements Serializable {

    private Transform transform;
    private boolean isStatic;
    private Placement placement;
    private String rendering;
    private Indexer indexer;
    private boolean isAutoDDLayer;
    private String autoDDId;
    private boolean retainSizeZoom;
    private boolean isPredicatedTable;

    public Transform getTransform() {
        return transform;
    }

    public boolean isStatic() {
        return isStatic;
    }

    public Placement getPlacement() {
        return placement;
    }

    public String getRendering() {
        return rendering;
    }

    public void setIndexer(Indexer idxer) {
        indexer = idxer;
    }

    public Indexer getIndexer() {
        return indexer;
    }

    public boolean isAutoDDLayer() {
        return isAutoDDLayer;
    }

    public String getAutoDDId() {
        return autoDDId;
    }

    public boolean isPredicatedTable() {
        return isPredicatedTable;
    }

    public boolean isRetainSizeZoom() {
        return retainSizeZoom;
    }

    public String getColStr(String tableName) {

        String colListStr = "";
        for (String col : transform.getColumnNames())
            colListStr += (tableName.isEmpty() ? "" : tableName + ".") + col + ", ";
        if (isAutoDDLayer) colListStr += "cluster_num, ";
        colListStr += "cx, cy, minx, miny, maxx, maxy";
        return colListStr;
    }

    @Override
    public String toString() {
        return "Layer{"
                + "transform="
                + transform
                + ", isStatic="
                + isStatic
                + ", placement="
                + placement
                + ", rendering='"
                + rendering
                + '\''
                + ", isAutoDDLayer="
                + isAutoDDLayer
                + ", autoDDId="
                + autoDDId
                + ", retainSizeZoom="
                + retainSizeZoom
                + '}';
    }
}
