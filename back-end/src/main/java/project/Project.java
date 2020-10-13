package project;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/** Created by wenbo on 1/4/18. */
public class Project {

    public Project() {
        mapInitialized = false;
    }

    // private variables
    private boolean mapInitialized = false;
    private Map<String, Canvas> canvasMap;
    private Map<String, View> viewMap;

    // JSON fields
    private String name;
    private ArrayList<View> views;
    private ArrayList<Canvas> canvases;
    private ArrayList<Jump> jumps;
    private ArrayList<SSV> ssvs;
    private ArrayList<Table> tables;
    private String renderingParams;
    private ArrayList<String> styles;

    // Back-end Generated Rendering parameters
    // The key of the hashmap is used to minimize occupied
    // namespace of the global rendering parameter dictionary
    // currently, it's only used by SSV indexers, which registers
    // keys like "ssv_0", "ssv_1", "ssv_2"...
    // the value of the hashmap is a regular dictionary mapping from
    // names to values. This is merged with compiler generated ones
    // in the frontend (pageOnLoad.js)
    private HashMap<String, HashMap<String, String>> BGRP = new HashMap<>();

    public String getName() {
        return name;
    }

    public ArrayList<View> getViews() {
        return views;
    }

    public ArrayList<Canvas> getCanvases() {
        return canvases;
    }

    public ArrayList<Jump> getJumps() {
        return jumps;
    }

    public ArrayList<SSV> getSsvs() {
        return ssvs;
    }

    public ArrayList<Table> getTables() {
        return tables;
    }

    public String getRenderingParams() {
        return renderingParams;
    }

    public HashMap<String, HashMap<String, String>> getBGRP() {
        return BGRP;
    }

    public void setBGRP(HashMap<String, HashMap<String, String>> BGRP) {
        this.BGRP = BGRP;
    }

    public void addBGRP(String key1, String key2, String val) {

        if (!BGRP.containsKey(key1)) BGRP.put(key1, new HashMap<>());
        BGRP.get(key1).put(key2, val);
    }

    public ArrayList<String> getStyles() {
        return styles;
    }

    public Canvas getCanvas(String canvasId) {

        if (!mapInitialized) {
            mapInitialized = true;
            initializeMaps();
        }
        if (canvasMap.containsKey(canvasId)) return canvasMap.get(canvasId);
        else return null;
    }

    public View getView(String viewId) {

        if (!mapInitialized) {
            mapInitialized = true;
            initializeMaps();
        }
        if (viewMap.containsKey(viewId)) return viewMap.get(viewId);
        else return null;
    }

    private void initializeMaps() {

        // initialize canvas map
        canvasMap = new HashMap<>();
        for (Canvas c : canvases) canvasMap.put(c.getId(), c);

        // initialize view map
        viewMap = new HashMap<>();
        for (View v : views) viewMap.put(v.getId(), v);
    }

    @Override
    public String toString() {
        return "Project{"
                + "name='"
                + name
                + '\''
                + ", views="
                + views
                + ", canvases="
                + canvases
                + ", jumps="
                + jumps
                + ", ssvs="
                + ssvs
                + ", renderingParams='"
                + renderingParams
                + '\''
                + ", BGRP='"
                + BGRP
                + '\''
                + ", styles='"
                + styles
                + '\''
                + '}';
    }
}
