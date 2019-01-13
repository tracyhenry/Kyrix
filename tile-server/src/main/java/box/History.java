package box;

import box.Box;
import project.Canvas;

public class History {
    static Canvas canvas;
    static int history;
    static Box box;

    public static void resetHistory(Canvas c) {
        history = 0;
        canvas = c;
        box = null;
    }
    public static void updateHistory(int count, Box b, Canvas c){
        history = count;
        box = b;
        canvas = c;
    }

    public static Canvas getCanvas(){
        return canvas;
    }

    public static int getCount(Canvas c){
        return history;
    }

}
