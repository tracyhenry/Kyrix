package box;

import project.Canvas;
import project.Project;

import java.sql.SQLException;
import java.util.ArrayList;

public class MikeBoxGetter extends BoxGetter {
    @Override
    //get box with fixed size which is two times larger than the viewport
    public BoxandData getBox(Canvas c, int mx, int my, int viewportH, int viewportW, ArrayList<String> predicates)
            throws SQLException, ClassNotFoundException {
        ArrayList<ArrayList<ArrayList<String>>> data;
        double wrapLength = 0.5;
        int minx = (int)Math.max(-10, mx - wrapLength * viewportW);
        int miny = (int)Math.max(-10, my - wrapLength * viewportH);
        int maxx = (int)Math.min(c.getW() + 10, minx + (1 + 2 * wrapLength) * viewportW);
        int maxy = (int)Math.min(c.getH() + 10, miny + (1 + 2 * wrapLength) * viewportH);

//        int minx = mx, miny = my, maxx = minx + 1024, maxy = miny + 1024;
        data = fetchData(c, minx, miny, maxx, maxy, predicates);

        Box box = new Box(minx, miny, maxx, maxy);
        return new BoxandData(box, data);
    }

}
