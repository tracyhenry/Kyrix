package project;

import java.io.Serializable;

/** Created by wenbo on 1/12/18. */
public class Placement implements Serializable {

    private String centroid_x;
    private String centroid_y;
    private String width;
    private String height;

    public String getCentroid_x() {
        return centroid_x;
    }

    public String getCentroid_y() {
        return centroid_y;
    }

    public String getWidth() {
        return width;
    }

    public String getHeight() {
        return height;
    }

    @Override
    public String toString() {
        return "Placement{"
                + "centroid_x='"
                + centroid_x
                + '\''
                + ", centroid_y='"
                + centroid_y
                + '\''
                + ", width='"
                + width
                + '\''
                + ", height='"
                + height
                + '\''
                + '}';
    }
}
