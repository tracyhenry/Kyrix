package box;

import java.util.ArrayList;
import project.Canvas;
import project.View;

public class MikeBoxGetter extends BoxGetter {
    @Override
    // get box with fixed size which is two times larger than the viewport
    public BoxandData getBox(
            Canvas c, View v, double mx, double my, Box oldBox, ArrayList<String> predicates)
            throws Exception {

        ArrayList<ArrayList<ArrayList<String>>> data;

        int vpW = v.getWidth();
        int vpH = v.getHeight();
        double wrapLength = 0.5;
        double minx = Math.max(-10, mx - wrapLength * vpW);
        double miny = Math.max(-10, my - wrapLength * vpH);
        double maxx = Math.min(c.getW() + 10, minx + (1 + 2 * wrapLength) * vpW);
        double maxy = Math.min(c.getH() + 10, miny + (1 + 2 * wrapLength) * vpH);
        Box newBox = new Box(minx, miny, maxx, maxy);
        data = fetchData(c, newBox, oldBox, predicates);

        Box box = new Box(minx, miny, maxx, maxy);
        return new BoxandData(box, data);
    }
}
