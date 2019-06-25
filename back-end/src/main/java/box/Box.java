package box;

public class Box {
    private double minx, miny, maxx, maxy;

    // a fixed size box which is two times larger than the viewport
    public Box(double minx, double miny, double maxx, double maxy) {
        this.minx = minx;
        this.maxx = maxx;
        this.miny = miny;
        this.maxy = maxy;
    }

    public double getWidth() {
        return maxx - minx;
    }

    public double getHeight() {
        return maxy - miny;
    }

    public double getMaxx() {
        return maxx;
    }

    public double getMaxy() {
        return maxy;
    }

    public double getMinx() {
        return minx;
    }

    public double getMiny() {
        return miny;
    }

    public String getCSV() {
        return minx + "," + miny + "," + maxx + "," + maxy;
    }
}
