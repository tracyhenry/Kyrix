package box;

import project.Canvas;
import project.Project;

import java.sql.SQLException;
import java.util.ArrayList;

public class MikeBoxGetter extends BoxGetter {
    @Override
    //get box with fixed size which is two times larger than the viewport
    public BoxandData getBox(Canvas c, int cx, int cy, int viewportH, int viewportW, ArrayList<String> predicates)
            throws SQLException, ClassNotFoundException {
        ArrayList<ArrayList<ArrayList<String>>> data;
        double wrapLength = 0.5;
        double minx = cx - (0.5 + wrapLength) * viewportW;
        double miny = cy - (0.5 + wrapLength) * viewportH;
        double maxx = cx + (0.5 + wrapLength) * viewportW;
        double maxy = cy + (0.5 + wrapLength) * viewportH;

        data = fetchData(c, minx, miny, maxx, maxy, predicates);

        Box box = new Box(minx, miny, maxx, maxy);
        return new BoxandData(box, data);
    }

}
