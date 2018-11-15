package box;

import project.Canvas;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;

public class History {

    // hardcode for mgh app, three views
    private static ArrayList<Canvas> canvases;
    private static ArrayList<Box> boxes;
    private static ArrayList<Integer> pointCounts;

    public static void reset(int viewId) {

        if (viewId == -1) {
            canvases = new ArrayList<>(Collections.nCopies(3, null));
            boxes = new ArrayList<>(Collections.nCopies(3, null));
            pointCounts = new ArrayList<>(Collections.nCopies(3, 0));
        }
        else {
            canvases.set(viewId, null);
            boxes.set(viewId, null);
            pointCounts.set(viewId, null);
        }
    }

    public static void updateHistory(int viewId, Canvas c, Box b, int count){

        boxes.set(viewId, b);
        canvases.set(viewId, c);
        pointCounts.set(viewId, count);
    }

    public static Canvas getCanvas(int viewId){

        return canvases.get(viewId);
    }

    public static Box getBox(int viewId) {

        return boxes.get(viewId);
    }

    public static int getCount(int viewId){

        return pointCounts.get(viewId);
    }
}
