package project;

public class PackNode extends Node {

    private double x;
    private double y;
    private double r;

    // 0 for not ready, 1 for ready, 2 for done
    private int status;

    public PackNode(Node node) {
        super(node);
        this.x = 0;
        this.y = 0;
        this.r = 0;
        this.status = 0;
    }

    public PackNode(Node node, double x, double y, double r) {
        super(node);
        this.x = x;
        this.y = y;
        this.r = r;
        this.status = 0;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public int getStatus() {
        return this.status;
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

    public void setR(double r) {
        this.r = r;
    }

    public double getR() {
        return this.r;
    }

    // public static void modX(PackNode node, double x) {
    //     node.x = x;
    // }

    @Override
    public String toString() {
        String nodestr = super.toString();
        nodestr +=
                "placement{ (x:"
                        + this.x
                        + ", y:"
                        + this.y
                        + ", r:"
                        + this.r
                        + ") status("
                        + this.status
                        + ")};";
        return nodestr;
    }
}
