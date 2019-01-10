package box;

import main.Main;
import project.Canvas;

import java.util.ArrayList;

public class MikeBoxGetter extends BoxGetter {
    @Override
    //get box with fixed size which is two times larger than the viewport
    public BoxandData getBox(Canvas c, double mx, double my, Box oldBox, ArrayList<String> predicates)
            throws Exception {

        ArrayList<ArrayList<ArrayList<String>>> data;
        int viewportW = Main.getProject().getViewportWidth();
        int viewportH = Main.getProject().getViewportHeight();
        double wrapLength = 0.5;
        double minx = Math.max(-10, mx - wrapLength * viewportW);
        double miny = Math.max(-10, my - wrapLength * viewportH);
        double maxx = Math.min(c.getW() + 10, minx + (1 + 2 * wrapLength) * viewportW);
        double maxy = Math.min(c.getH() + 10, miny + (1 + 2 * wrapLength) * viewportH);
        Box newBox = new Box(minx, miny, maxx, maxy);
        data = fetchData(c, newBox, oldBox, predicates);

        Box box = new Box(minx, miny, maxx, maxy);
        return new BoxandData(box, data);
    }
}
