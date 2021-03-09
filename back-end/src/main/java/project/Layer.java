package project;

import index.Indexer;
import java.io.Serializable;
import java.sql.SQLException;
import java.util.ArrayList;

/** Created by wenbo on 4/3/18. */
public class Layer implements Serializable {

    private Transform transform;
    private Boolean isStatic;
    private String fetchingScheme;
    private Boolean deltaBox;
    private Placement placement;
    private String rendering;
    private ArrayList<String> tooltipColumns, tooltipAliases;
    private transient Indexer indexer;
    private String ssvId, usmapId, staticAggregationId;
    private String indexerType;

    public Transform getTransform() {
        return transform;
    }

    public boolean isStatic() {
        return isStatic;
    }

    public String getFetchingScheme() {
        return fetchingScheme;
    }

    public boolean isDeltaBox() {
        return deltaBox;
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

    public String getSSVId() {
        return ssvId;
    }

    public String getUsmapId() {
        return usmapId;
    }

    public String getStaticAggregationId() {
        return staticAggregationId;
    }

    public void setIndexerType(String indexerType) {
        this.indexerType = indexerType;
    }

    public String getIndexerType() {
        return indexerType;
    }

    public String getColStr(String tableName) throws SQLException, ClassNotFoundException {

        String colListStr = "";
        for (String col : transform.getColumnNames())
            colListStr += (tableName.isEmpty() ? "" : tableName + ".") + col + ", ";
        if (getIndexerType().equals("SSVInMemoryIndexer")) colListStr += "clusterAgg, ";
        colListStr += "cx, cy, minx, miny, maxx, maxy";
        return colListStr;
    }

    public void setRendering(String rendering) {
        this.rendering = rendering;
    }

    public void setTransform(Transform transform) {
        this.transform = transform;
    }

    public void setPlacement(Placement placement) {
        this.placement = placement;
    }

    public void setFetchingScheme(String fetchingScheme) {
        this.fetchingScheme = fetchingScheme;
    }

    public void setTooltipColumns(ArrayList<String> tooltipColumns) {
        this.tooltipColumns = tooltipColumns;
    }

    public void setTooltipAliases(ArrayList<String> tooltipAliases) {
        this.tooltipAliases = tooltipAliases;
    }

    public void setSsvId(String ssvId) {
        this.ssvId = ssvId;
    }

    public void setUsmapId(String usmapId) {
        this.usmapId = usmapId;
    }

    public void setStaticAggregationId(String staticAggregationId) {
        this.staticAggregationId = staticAggregationId;
    }

    public void setStatic(Boolean aStatic) {
        isStatic = aStatic;
    }

    public void setDeltaBox(Boolean deltaBox) {
        this.deltaBox = deltaBox;
    }

    @Override
    public String toString() {
        return "Layer{"
                + "transform="
                + transform
                + ", isStatic="
                + isStatic
                + ", fetchingScheme="
                + fetchingScheme
                + ", deltaBox="
                + deltaBox
                + ", placement="
                + placement
                + ", rendering='"
                + rendering
                + '\''
                + ", ssvId="
                + ssvId
                + ", usmapId="
                + usmapId
                + ", staticAggregationId="
                + staticAggregationId
                + '}';
    }
}
