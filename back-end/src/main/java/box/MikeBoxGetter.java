package box;

import cache.DBoxCache;
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
        data = DBoxCache.getData(c, newBox, predicates);
        if (data.size() == 0) {
            Box squaredBox = DBoxCache.getSquaredBox(newBox, oldBox);
            Box existingBox = DBoxCache.getPartialHit(c, newBox, predicates);
            if (existingBox!=null){
                data = fetchData(c, squaredBox, existingBox, predicates);
            }
            else{
                data = fetchData(c, squaredBox, oldBox, predicates);
            }
            DBoxCache.addData(data, c, newBox, predicates);
            data = DBoxCache.getData(c, newBox, predicates);
        }
        Box box = new Box(minx, miny, maxx, maxy);
        return new BoxandData(box, data);
    }
}
