package project;

import java.io.Serializable;

/** Created by wenbo on 1/4/18. */
public class Jump implements Serializable {

    private String sourceId, destId;
    private String type;
    private String selector, viewport, predicates, name;
    private String sourceViewId, destViewId;
    private Boolean noPrefix, slideSuperman;
    private Double slideDirection;

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

    public double getSlideDirection() {
        return slideDirection;
    }

    public Boolean getSlideSuperman() {
        return slideSuperman;
    }

    public void setDestId(String destId) {
        this.destId = destId;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setSelector(String selector) {
        this.selector = selector;
    }

    public void setViewport(String viewport) {
        this.viewport = viewport;
    }

    public void setPredicates(String predicates) {
        this.predicates = predicates;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setSourceViewId(String sourceViewId) {
        this.sourceViewId = sourceViewId;
    }

    public void setDestViewId(String destViewId) {
        this.destViewId = destViewId;
    }

    public void setNoPrefix(Boolean noPrefix) {
        this.noPrefix = noPrefix;
    }

    public void setSlideSuperman(Boolean slideSuperman) {
        this.slideSuperman = slideSuperman;
    }

    public void setSlideDirection(Double slideDirection) {
        this.slideDirection = slideDirection;
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
                + ", noPrefix="
                + noPrefix
                + ", slideSuperman="
                + slideSuperman
                + ", slideDirection="
                + slideDirection
                + '}';
    }
}
