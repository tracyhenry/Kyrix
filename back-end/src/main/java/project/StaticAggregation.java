package project;

/** Created by wenbo on 1/23/21. */
public class StaticAggregation {
    private String getWordCloudCoordinatesBody, type;

    public String getGetWordCloudCoordinatesBody() {
        return getWordCloudCoordinatesBody;
    }

    public String getType() {
        return type;
    }

    @Override
    public String toString() {
        return "StaticAggregation{"
                + "getWordCloudCoordinatesBody='"
                + getWordCloudCoordinatesBody
                + '\''
                + ", type='"
                + type
                + '\''
                + '}';
    }
}
