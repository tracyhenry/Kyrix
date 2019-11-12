package index.util;

/** Created by wenbo on 11/10/19. */
public class KDTree {

    public enum SplitDir {
        HORIZONTAL,
        VERTICAL
    };

    public double minx, miny, maxx, maxy;
    public SplitDir splitDir;
    public long count;
    public KDTree lc, rc;
    public double splitPoint;

    public KDTree(
            double minx, double miny, double maxx, double maxy, SplitDir splitDir, long count) {
        this.minx = minx;
        this.miny = miny;
        this.maxx = maxx;
        this.maxy = maxy;
        this.splitDir = splitDir;
        this.count = count;
        lc = rc = null;
    }

    @Override
    public String toString() {
        return "KDTree{"
                + "minx="
                + minx
                + ", miny="
                + miny
                + ", maxx="
                + maxx
                + ", maxy="
                + maxy
                + ", splitDir="
                + splitDir
                + ", count="
                + count
                + ", splitPoint="
                + splitPoint
                + '}';
    }
}
