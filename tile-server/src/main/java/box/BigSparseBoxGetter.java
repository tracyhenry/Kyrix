package box;

import main.Main;
import project.Canvas;
import project.Project;

import java.sql.SQLException;
import java.util.ArrayList;

public class BigSparseBoxGetter extends BoxGetter{
    public BoxandData getBox(Canvas c, int mx, int my, int viewportH, int viewportW, ArrayList<String> predicates)
            throws SQLException, ClassNotFoundException {
        ArrayList<ArrayList<ArrayList<String>>> data;
        double wrapLength = 0.5;
        int count = 0;
        int minx = (int)Math.max(0, mx - wrapLength * viewportW);
        int miny = (int)Math.max(0, my - wrapLength * viewportH);
        int maxx = (int)Math.min(c.getH(), minx + (1 + 2 * wrapLength) * viewportW);
        int maxy = (int)Math.min(c.getW(), miny + (1 + 2 * wrapLength) * viewportH);
        int deltaRight = (int)0.5 * viewportW;
        int deltaLeft = (int)0.5 * viewportW;
        int deltaUp = (int)0.5 * viewportH;
        int deltaDown = (int)0.5 * viewportH;

        //check if regular size box contains dense area
        data = fetchData(c, minx, miny, maxx, maxy, predicates);
        for (int i = 0; i < data.get(0).size(); i++)
            count += data.get(i).size();

        if (count > 20000) {
            Box box = new Box(minx, miny, maxx, maxy);
            return new BoxandData(box, data);
        }

        //extend rightwards
        for (int extendCount =0; extendCount < 20000;) {
            deltaRight *= 2;
            data = fetchData(c, maxx, miny, maxx + deltaRight, maxy, predicates);
            for (int i = 0; i < data.get(0).size(); i++)
                extendCount += data.get(i).size();
        }
        maxx += deltaRight;
        //extend downwards
        for (int extendCount =0; extendCount < 20000;) {
            deltaDown *= 2;
            data = fetchData(c, minx, maxy, maxx, maxy + deltaDown, predicates);
            for (int i = 0; i < data.get(0).size(); i++)
                extendCount += data.get(i).size();
        }
        maxy += deltaDown;
        //extend leftwards
        for (int extendCount =0; extendCount < 20000;) {
            deltaLeft *= 2;
            data = fetchData(c, minx - deltaLeft, miny, minx, maxy, predicates);
            for (int i = 0; i < data.get(0).size(); i++)
                extendCount += data.get(i).size();
        }
        minx -= deltaLeft;
        //extend upwards
        for (int extendCount =0; extendCount < 20000;) {
            deltaUp *= 2;
            data = fetchData(c, minx, miny - deltaUp, maxx, miny, predicates);
            for (int i = 0; i < data.get(0).size(); i++)
                extendCount += data.get(i).size();
        }
        miny -= deltaUp;

        data = fetchData(c, minx, miny, maxx, maxy, predicates);
        Box box = new Box(minx, miny, maxx, maxy);
        return new BoxandData(box, data);
    }
}
