package project;

public class Node {
    protected String id;
    protected String parent;
    protected double value;
    protected int depth;
    protected int height;
    // count of its direct children
    protected int count;

    // protected ArrayList<Node> children;

    public Node() {
        this.id = "";
        this.parent = "";
        this.value = -1;
        this.depth = -1;
        this.height = -1;
        this.count = 0;
    }

    public Node(String id, String parent) {
        this.id = id;
        this.parent = parent;
    }

    public Node(Node node) {
        this.id = node.getId();
        this.parent = node.getParent();
        this.value = node.getValue();
        this.depth = node.getDepth();
        this.height = node.getHeight();
        this.count = node.getCount();
    }

    public Node(String _id, String _parent, double _value, int _depth, int _height, int _count) {
        this.id = _id;
        this.parent = _parent;
        this.value = _value;
        this.depth = _depth;
        this.height = _height;
        this.count = _count;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getId() {
        return this.id;
    }

    public void setValue(double value) {
        this.value = value;
    }

    public double getValue() {
        return this.value;
    }

    public void setHeight(int height) {
        this.height = height;
    }

    public int getHeight() {
        return this.height;
    }

    public void setDepth(int depth) {
        this.depth = depth;
    }

    public int getDepth() {
        return this.depth;
    }

    public void setParent(String parent) {
        this.parent = parent;
    }

    public String getParent() {
        return this.parent;
    }

    public void setCount(int count) {
        this.count = count;
    }

    public int getCount() {
        return this.count;
    }

    @Override
    public String toString() {
        return "Node{"
                + "id:'"
                + this.id
                + '\''
                + ", parent:'"
                + this.parent
                + '\''
                + ", value:"
                + this.value
                + ", height:"
                + this.height
                + ", depth="
                + this.depth
                + ", count="
                + this.count
                + "}";
    }
}
