package box;

import project.Canvas;

import java.util.ArrayList;

public class MikeBoxGetter extends BoxGetter {
    @Override
    //get box with fixed size which is two times larger than the viewport
    public BoxandData getBox(Canvas c, double mx, double my, int viewportH, int viewportW, ArrayList<String> predicates, boolean hasBox)
            throws Exception {

        ArrayList<ArrayList<ArrayList<String>>> data;
        double wrapLength = 0.5;
        double minx = Math.max(-10, mx - wrapLength * viewportW);
        double miny = Math.max(-10, my - wrapLength * viewportH);
        double maxx = Math.min(c.getW() + 10, minx + (1 + 2 * wrapLength) * viewportW);
        double maxy = Math.min(c.getH() + 10, miny + (1 + 2 * wrapLength) * viewportH);

        data = fetchData(c, minx, miny, maxx, maxy, predicates, hasBox);

        Box box = new Box(minx, miny, maxx, maxy);
        return new BoxandData(box, data);
    }
}
