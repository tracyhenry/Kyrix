package project;

public class CirclePacking extends Hierarchy {
    private double height;
    private double width;

    private double padding;
    private double threshold;

    public double getPadding() {
        return this.padding;
    }

    public double getHeight() {
        return this.height;
    }

    public double getWidth() {
        return this.width;
    }

    public double getThreshold() {
        return threshold;
    }

    @Override
    public String toString() {
        return "CirclePacking{"
                + "filepath='"
                + this.filepath
                + '\''
                + "type='"
                + this.type
                + '\''
                + "id='"
                + this.id
                + '\''
                + "value='"
                + this.value
                + '\''
                + "children='"
                + this.children
                + '\''
                + ", expanded="
                + this.expanded
                + ", zoomFactor="
                + this.zoomFactor
                + ", height="
                + this.height
                + ", width="
                + this.width
                + ", padding="
                + this.padding
                + '}';
    }
}
