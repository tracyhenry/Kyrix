package project;

import java.sql.SQLException;
import server.Exclude;

public class Hierarchy {
    protected String filepath;
    @Exclude protected String type;
    protected String name;
    protected String id;
    protected String value;
    protected String children;
    protected Boolean indexed;
    protected double zoomFactor;

    public void setZoomFactor(double zoomFactor) {
        this.zoomFactor = zoomFactor;
    }

    public double getZoomFactor() {
        return zoomFactor;
    }

    public void setIndexed(Boolean indexed) {
        this.indexed = indexed;
    }

    public Boolean getIndexed() {
        return indexed;
    }

    public void setChildren(String children) {
        this.children = children;
    }

    public String getChildren() {
        return children;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getId() {
        return id;
    }

    public void setFilepath(String filepath) {
        this.filepath = filepath;
    }

    public String getFilepath() {
        return filepath;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getType() {
        return type;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void calcLayout(int level, String bboxTableName, Node root)
            throws SQLException, ClassNotFoundException {
        System.out.println("Calculating Layout, class = " + this.getClass().toString());
        System.out.println("Calculating Layout, pyramid level = " + level);
    }

    @Override
    public String toString() {
        return "Hierarchy{"
                + "filepath='"
                + filepath
                + '\''
                + "id='"
                + id
                + '\''
                + "value='"
                + value
                + '\''
                + "children='"
                + children
                + '\''
                + ", indexed="
                + indexed
                + ", zoomFactor="
                + zoomFactor
                + '}';
    }
}
