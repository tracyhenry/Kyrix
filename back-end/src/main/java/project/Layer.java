package project;

import com.google.gson.annotations.SerializedName;
import index.Indexer;
import java.io.Serializable;

/** Created by wenbo on 4/3/18. */
public class Layer implements Serializable {

    private Transform transform;
    private boolean isStatic;
    private Placement placement;
    private String rendering;
    private transient Indexer indexer;
    private boolean isAutoDDLayer;
    private boolean isHierarchicalLayer;
    private String autoDDId;
    private boolean isPredicatedTable;
    private int level;

    @SerializedName("indexer")
    private String indexerClassName;

    public void setIndexerClassName(String indexerClassName) {
        this.indexerClassName = indexerClassName;
    }

    public String getIndexerClassName() {
        return indexerClassName;
    }

    public void setLevel(int level) {
        this.level = level;
    }

    public int getLevel() {
        return level;
    }

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

    public boolean isHierarchicalLayer() {
        return isHierarchicalLayer;
    }

    public boolean isPredicatedTable() {
        return isPredicatedTable;
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
                + ", isHierarchicalLayer="
                + isHierarchicalLayer
                + '}';
    }
}
