package project;

import java.sql.PreparedStatement;
import java.util.Stack;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import third_party.Exclude;

public class CirclePacking extends Hierarchy {
    private double height;
    private double width;
    private double x;
    private double y;

    private double padding;
    private double threshold;

    @Exclude private Stack<PackNode> prestack;
    @Exclude private Stack<PackNode> poststack;
    @Exclude private int rowCount;
    @Exclude private PreparedStatement insertStmt;
    @Exclude private String bboxTableName;
    @Exclude private int zoomLevel;
    @Exclude private Boolean flag;
    @Exclude private NashornScriptEngine engine;
    @Exclude public int indexTime;
    // CirclePacking(){
    //     super();
    //     prestack = new Stack<>();
    //     poststack = new Stack<>();
    // }

    public void setPadding(double padding) {
        this.padding = padding;
    }

    public double getPadding() {
        return this.padding;
    }

    public void setHeight(double height) {
        this.height = height;
    }

    public double getHeight() {
        return this.height;
    }

    public void setWidth(double width) {
        this.width = width;
    }

    public double getWidth() {
        return this.width;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getX() {
        return this.x;
    }

    public void setY(double y) {
        this.y = y;
    }

    public double getY() {
        return this.y;
    }

    public void setThreshold(double threshold) {
        this.threshold = threshold;
    }

    public double getThreshold() {
        return threshold;
    }

    @Override
    public String toString() {
        return "CirclePacking{"
                + "filepath='"
                + this.filepath
                + '\''
                + "type='"
                + this.type
                + '\''
                + "id='"
                + this.id
                + '\''
                + "value='"
                + this.value
                + '\''
                + "children='"
                + this.children
                + '\''
                + ", indexed="
                + this.indexed
                + ", zoomFactor="
                + this.zoomFactor
                + ", height="
                + this.height
                + ", width="
                + this.width
                + ", x="
                + this.x
                + ", y="
                + this.y
                + ", padding="
                + this.padding
                + '}';
    }
}
