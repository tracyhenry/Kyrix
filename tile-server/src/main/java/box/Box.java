package box;

import java.util.ArrayList;

public class Box {
    private int minx, miny, maxx, maxy;

    // a fixed size box which is two times larger than the viewport
    public Box(int minx, int miny, int maxx, int maxy) {
        this.minx = minx;
        this.maxx = maxx;
        this.miny = miny;
        this.maxy = maxy;
    }

    public int getWidth() {
        return maxx - minx;
    }

    public int getHight() {
        return maxy - miny;
    }

    public int getMaxx(){
        return maxx;
    }

    public int getMaxy(){
        return maxy;
    }

    public int getMinx() {
        return minx;
    }

    public int getMiny() {
        return miny;
    }
}