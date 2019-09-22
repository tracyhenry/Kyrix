package project;

public class Node {
    protected int id;
    protected String name;
    protected int parent;
    protected double value;
    protected int depth;
    protected int height;
    // count of its direct children
    protected int count;

    // protected ArrayList<Node> children;

    public Node() {
        this.id = -1;
        this.name = "";
        this.parent = -1;
        this.value = -1;
        this.depth = -1;
        this.height = -1;
        this.count = 0;
    }

    public Node(int id, int parent) {
        this.id = id;
        this.parent = parent;
    }

    public Node(Node node) {
        this.id = node.getId();
        this.name = node.getName();
        this.parent = node.getParent();
        this.value = node.getValue();
        this.depth = node.getDepth();
        this.height = node.getHeight();
        this.count = node.getCount();
    }

    public Node(
            int _id,
            String _name,
            int _parent,
            double _value,
            int _depth,
            int _height,
            int _count) {
        this.id = _id;
        this.name = _name;
        this.parent = _parent;
        this.value = _value;
        this.depth = _depth;
        this.height = _height;
        this.count = _count;
    }

    public void setId(int id) {
        this.id = id;
    }

    public int getId() {
        return this.id;
    }

    public String getName() {
        return this.name;
    }

    public void setName(String name) {
        this.name = name;
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

    public void setParent(int parent) {
        this.parent = parent;
    }

    public int getParent() {
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
                + "name:'"
                + this.name
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
