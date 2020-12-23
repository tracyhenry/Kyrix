package project;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/** Created by wenbo on 1/4/18. */
public class UpdateRequest {

    public UpdateRequest() {
    }

    // private variables
    // private boolean mapInitialized = false;
    // private Map<String, Canvas> canvasMap;
    // private Map<String, View> viewMap;

    // // JSON fields
    // private String name;
    // private ArrayList<View> views;
    // private ArrayList<Canvas> canvases;
    // private ArrayList<Jump> jumps;
    // private ArrayList<SSV> ssvs;
    // private ArrayList<Table> tables;
    // private String renderingParams;
    // private ArrayList<String> styles;

    private String canvasId;
    private String layerId;
    private ArrayList<String> keyColumns;
    private HashMap<String, String> objectAttributes;
    private String baseTable;
    private String projectName;


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

    public String getProjectName() {
      return projectName;
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
                + ", projectName='"
                + projectName
                + '\''
                + '}';
    }
}
