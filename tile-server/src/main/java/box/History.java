package box;

import project.Canvas;
import java.util.ArrayList;

public class History {

    private static Canvas canvas;
    private static Box box;
    private static ArrayList<String> predicates;
    private static int count;

    public static void reset() {

        canvas = null;
        box = null;
        predicates = null;
        count = 0;
    }

    public static void updateHistory(Canvas c, Box b, ArrayList<String> p, int ct) {

        box = b;
        canvas = c;
        predicates = p;
        count = ct;
    }

    public static Box getBox() {

        return box;
    }

    public static boolean lastBoxExist(Canvas c, ArrayList<String> p) {

        if (canvas == null)
            return false;
        if (! canvas.getId().equals(c.getId()))
            return false;
        if (predicates.size() != p.size())
            return false;
        for (int i = 0; i < predicates.size(); i ++)
            if (! predicates.get(i).equals(p.get(i)))
                return false;
        return true;
    }
}
