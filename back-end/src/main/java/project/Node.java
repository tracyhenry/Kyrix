package project;

public class Node {
    private String id;
    private int height;
    private int depth;
    private String parent;
    private double value;

    // private ArrayList<Node> children;

    public Node() {
        this.id = "";
        this.parent = "";
        this.depth = -1;
        this.height = -1;
        this.value = -1;
    }

    public Node(String id, String parent) {
        this.id = id;
        this.parent = parent;
    }

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

    // public ArrayList<Node> getChildren() {
    //     return children;
    // }

    @Override
    public String toString() {
        return "Node{"
                + "id:'"
                + id
                + '\''
                + ", parent:'"
                + parent
                + '\''
                + ", value:"
                + value
                + ", height:"
                + height
                + ", depth="
                + depth
                + "}";
    }
}
