package project;

import java.util.ArrayList;
import java.util.HashMap;

/** Created by peter on 12/23/20 */
public class UpdateRequest {

    /**
     * UpdateRequest is an object that holds the data of a POST request body to /update. See
     * UpdateRequestHandler.java for usage
     */
    public UpdateRequest() {}

    private String canvasId;
    private String layerId;
    private ArrayList<String> keyColumns;
    private HashMap<String, String> objectAttributes;
    private String baseTable;

    public String getCanvasId() {
        return canvasId;
    }

    public String getLayerId() {
        return layerId;
    }

    public ArrayList<String> getKeyColumns() {
        return keyColumns;
    }

    public HashMap<String, String> getObjectAttributes() {
        return objectAttributes;
    }

    public String getBaseTable() {
        return baseTable;
    }

    @Override
    public String toString() {
        return "UpdateRequest {"
                + "canvasId='"
                + canvasId
                + '\''
                + ", layerId="
                + layerId
                + ", keyColumns="
                + keyColumns
                + ", objectAttributes="
                + objectAttributes
                + ", baseTable='"
                + baseTable
                + '\''
                + '}';
    }
}
