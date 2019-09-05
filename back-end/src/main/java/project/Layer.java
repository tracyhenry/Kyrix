package project;

import com.google.gson.annotations.SerializedName;
import index.Indexer;
import java.io.Serializable;
import third_party.Exclude;

/** Created by wenbo on 4/3/18. */
public class Layer implements Serializable {

    private Transform transform;
    private boolean isStatic;
    private String fetchingScheme;
    private boolean deltaBox;
    private Placement placement;
    private String rendering;
    @Exclude private Indexer indexer;
    private String autoDDId;

    /*
    @ SerializedName is an annotation used in gson
    so that the json fieldname does not have to be the exact same string as in the Java Class.
    Usage:
    1. Simple version: @SerializedName("jsonfield") private String javafield;
    2. More capable version: @SerializedName(value="jsondefault", alternate={"jsonalt1", "jsonalt2"});
    Note that SerializedName will cover the original field
    more information can be found at:
    https://static.javadoc.io/com.google.code.gson/gson/2.6.2/com/google/gson/annotations/SerializedName.html
    */
    @SerializedName(
            value = "indexerClass",
            alternate = {"indexerType", "indexerName"})
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

    public String getAutoDDId() {
        return autoDDId;
    }

    public void setIndexerType(String indexerType) {
        this.indexerType = indexerType;
    }

    public String getIndexerType() {
        return indexerType;
    }

    public String getColStr(String tableName) {

        String colListStr = "";
        for (String col : transform.getColumnNames())
            colListStr += (tableName.isEmpty() ? "" : tableName + ".") + col + ", ";
        if (this.getIndexerType().equals("AutoDDInMemoryIndexer")) colListStr += "cluster_num, ";
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
                + ", fetchingScheme="
                + fetchingScheme
                + ", deltaBox="
                + deltaBox
                + ", placement="
                + placement
                + ", rendering='"
                + rendering
                + '\''
                + ", autoDDId="
                + autoDDId
                + '}';
    }
}
