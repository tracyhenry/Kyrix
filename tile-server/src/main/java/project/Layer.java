package project;

import index.Indexer;

/**
 * Created by wenbo on 4/3/18.
 */
public class Layer {

    private Transform transform;
    private boolean isStatic;
    private Placement placement;
    private String rendering;
    private Indexer indexer;

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

    public void setIndexer(Indexer idxer) {
        indexer = idxer;
    }

    public Indexer getIndexer() {
        return indexer;
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
