package project;

/** Created by wenbo on 1/4/18. */
public class Jump {

    private String sourceId, destId;
    private String type;
    private String selector, viewport, predicates, name;
    private String sourceViewId, destViewId;
    private Boolean noPrefix;

    public String getSourceId() {
        return sourceId;
    }

    public String getDestId() {
        return destId;
    }

    public String getSelector() {
        return selector;
    }

    public String getType() {
        return type;
    }

    public String getViewport() {
        return viewport;
    }

    public String getPredicates() {
        return predicates;
    }

    public String getName() {
        return name;
    }

    public String getSourceViewId() {
        return sourceViewId;
    }

    public String getDestViewId() {
        return destViewId;
    }

    public Boolean getNoPrefix() {
        return noPrefix;
    }

    @Override
    public String toString() {
        return "Jump{"
                + "sourceId='"
                + sourceId
                + '\''
                + ", destId='"
                + destId
                + '\''
                + ", type='"
                + type
                + '\''
                + ", selector='"
                + selector
                + '\''
                + ", viewport='"
                + viewport
                + '\''
                + ", predicates='"
                + predicates
                + '\''
                + ", name='"
                + name
                + '\''
                + ", sourceViewId='"
                + sourceViewId
                + '\''
                + ", destViewId='"
                + destViewId
                + '\''
                + ", noPrefix='"
                + noPrefix
                + '\''
                + '}';
    }
}
