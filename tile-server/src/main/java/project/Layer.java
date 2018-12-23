package project;

/**
 * Created by wenbo on 4/3/18.
 */
public class Layer {

    private Transform transform;
    private boolean isStatic;
    private Placement placement;
    private String rendering;

    public Transform getTransform() {
        return transform;
    }

    public boolean isStatic() {
        return isStatic;
    }

    public Placement getPlacement() {
        return placement;
    }

    public String getRendering() {
        return rendering;
    }

    @Override
    public String toString() {
        return "Layer{" +
                "transform='" + transform + '\'' +
                ", isStatic=" + isStatic +
                ", placement=" + placement +
                ", rendering='" + rendering + '\'' +
                '}';
    }
}
