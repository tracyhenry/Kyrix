package project;

import com.google.gson.annotations.SerializedName;
import java.util.ArrayList;

public class Node {
    @SerializedName("word")
    private String id;

    private int height;
    private int depth;
    private String parent;

    @SerializedName("frequency")
    private double value;

    private ArrayList<Node> children;

    public void setId(String id) {
        this.id = id;
    }

    public String getId() {
        return id;
    }

    public void setValue(double value) {
        this.value = value;
    }

    public double getValue() {
        return value;
    }

    public void setHeight(int height) {
        this.height = height;
    }

    public int getHeight() {
        return height;
    }

    public void setDepth(int depth) {
        this.depth = depth;
    }

    public int getDepth() {
        return depth;
    }

    public void setParent(String parent) {
        this.parent = parent;
    }

    public String getParent() {
        return parent;
    }

    public ArrayList<Node> getChildren() {
        return children;
    }

    @Override
    public String toString() {
        return "Node{"
                + "label='"
                + id
                + '\''
                + ", parent='"
                + parent
                + '\''
                + ", value='"
                + value
                + '\''
                + ", children='"
                + children
                + "}";
    }
}
