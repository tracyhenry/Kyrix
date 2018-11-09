package project;

/**
 * Created by wenbo on 4/3/18.
 */
public class Layer {

    private String transformId;
    private boolean isStatic;
    private Placement placement;
    private String rendering;

    public String getTransformId() {
        return transformId;
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
                "transformId='" + transformId + '\'' +
                ", isStatic=" + isStatic +
                ", placement=" + placement +
                ", rendering='" + rendering + '\'' +
                '}';
    }
}
