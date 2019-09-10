package project;

import java.sql.SQLException;
import javax.script.ScriptException;
import third_party.Exclude;

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
        return this.zoomFactor;
    }

    public void setIndexed(Boolean indexed) {
        this.indexed = indexed;
    }

    public Boolean getIndexed() {
        return this.indexed;
    }

    public void setChildren(String children) {
        this.children = children;
    }

    public String getChildren() {
        return this.children;
    }

    public void setValue(String value) {
        this.value = value;
    }

    public String getValue() {
        return this.value;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getId() {
        return this.id;
    }

    public void setFilepath(String filepath) {
        this.filepath = filepath;
    }

    public String getFilepath() {
        return this.filepath;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getType() {
        return this.type;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getName() {
        return this.name;
    }

    public void calcLayout(Canvas c, int layerId, Node root)
            throws SQLException, ClassNotFoundException, ScriptException, NoSuchMethodException {
        System.out.println("Calculating Layout, class = " + this.getClass().toString());
        System.out.println("Calculating Layout, pyramid level = " + c.getZoomLevel());
    }

    @Override
    public String toString() {
        return "Hierarchy{"
                + "filepath='"
                + this.filepath
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
                + '}';
    }
}
