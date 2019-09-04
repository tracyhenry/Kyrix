package project;

public class PackNode extends Node {

    public double x;
    public double y;
    public double r;

    // 0 for not ready, 1 for ready, 2 for done
    public int status;

    PackNode(Node node) {
        super(node);
        x = 5;
        y = 4;
        r = Math.sqrt(value);
        status = 0;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public int getStatus() {
        return status;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getX() {
        return x;
    }

    public void setY(double y) {
        this.y = y;
    }

    public double getY() {
        return y;
    }

    public void setR(double r) {
        this.r = r;
    }

    public double getR() {
        return r;
    }

    // public static void modX(PackNode node, double x) {
    //     node.x = x;
    // }

    @Override
    public String toString() {
        String nodestr = super.toString();
        nodestr += "placement{ (x:" + x + ", y:" + y + ", r:" + r + ") status(" + status + ")};\n";
        return nodestr;
    }
}
