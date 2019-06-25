package project;

/** Created by wenbo on 1/29/19. */
public class View {

    private String id;
    private int minx, miny, width, height;
    private String initialCanvasId;
    private int initialViewportX;
    private int initialViewportY;
    private String initialPredicates;

    public String getId() {
        return id;
    }

    public int getMinx() {
        return minx;
    }

    public int getMiny() {
        return miny;
    }

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }

    public String getInitialCanvasId() {
        return initialCanvasId;
    }

    public int getInitialViewportX() {
        return initialViewportX;
    }

    public int getInitialViewportY() {
        return initialViewportY;
    }

    public String getInitialPredicates() {
        return initialPredicates;
    }

    @Override
    public String toString() {
        return "View{"
                + "minx="
                + minx
                + ", miny="
                + miny
                + ", width="
                + width
                + ", height="
                + height
                + ", initialCanvasId='"
                + initialCanvasId
                + '\''
                + ", initialViewportX="
                + initialViewportX
                + ", initialViewportY="
                + initialViewportY
                + ", initialPredicates='"
                + initialPredicates
                + '\''
                + '}';
    }
}
