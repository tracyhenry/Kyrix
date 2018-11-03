package box;

import project.Canvas;

public class History {
    static Canvas canvas;
    static Box box;
    static int pointCount;

    public static void reset() {

        canvas = null;
        box = null;
        pointCount = 0;
    }
    public static void updateHistory(Canvas c, Box b, int count){

        box = b;
        canvas = c;
        pointCount = count;
    }

    public static Canvas getCanvas(){
        return canvas;
    }

    public static int getCount(Canvas c){
        return pointCount;
    }
}
