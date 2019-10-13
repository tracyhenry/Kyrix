package project;

public class Hierarchy {
    protected String filepath;
    protected String type;
    protected String name;
    protected String id;
    protected String value;
    protected String children;
    protected Boolean expanded = false;
    protected double zoomFactor;

    public double getZoomFactor() {
        return this.zoomFactor;
    }

    public Boolean getExpanded() {
        return this.expanded;
    }

    public String getChildren() {
        return this.children;
    }

    public String getValue() {
        return this.value;
    }

    public String getId() {
        return this.id;
    }

    public String getFilepath() {
        return this.filepath;
    }

    public String getName() {
        return this.name;
    }

    public void setExpanded(Boolean expanded) {
        this.expanded = expanded;
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
                + ", expanded="
                + this.expanded
                + ", zoomFactor="
                + this.zoomFactor
                + '}';
    }
}
