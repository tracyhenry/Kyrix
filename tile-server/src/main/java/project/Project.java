package project;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by wenbo on 1/4/18.
 */
public class Project {

    public Project() {
        mapInitialized = false;
    }

    // private variables
    private boolean mapInitialized = false;
    private Map<String, Canvas> canvasMap;
    private Map<String, View> viewMap;
    private Map<String, ArrayList<Jump>> jumpMap;

    // JSON fields
    private String name;
    private ArrayList<View> views;
    private ArrayList<Canvas> canvases;
    private ArrayList<Jump> jumps;
    private String renderingParams;

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

    public String getRenderingParams() {
        return renderingParams;
    }

    public Canvas getCanvas(String canvasId) {

        if (! mapInitialized) {
            mapInitialized = true;
            initializeMaps();
        }
        if (canvasMap.containsKey(canvasId))
            return canvasMap.get(canvasId);
        else
            return null;
    }

    public View getView(String viewId) {

        if (! mapInitialized) {
            mapInitialized = true;
            initializeMaps();
        }
        if (viewMap.containsKey(viewId))
            return viewMap.get(viewId);
        else
            return null;
    }

    public ArrayList<Jump> getJumps(String canvasId) {

        if (! mapInitialized) {
            mapInitialized = true;
            initializeMaps();
        }
        if (jumpMap.containsKey(canvasId))
            return jumpMap.get(canvasId);
        else
            return null;
    }

    private void initializeMaps() {

        // initialize canvas map
        canvasMap = new HashMap<>();
        for (Canvas c : canvases)
            canvasMap.put(c.getId(), c);

        // initialize view map
        viewMap = new HashMap<>();
        for (View v : views)
            viewMap.put(v.getId(), v);

        // initialize jump map
        jumpMap = new HashMap<>();
        for (Canvas c : canvases) {

            String curCanvasId = c.getId();
            jumpMap.put(curCanvasId, new ArrayList<Jump>());
            for (Jump j : jumps)
                if (j.getSourceId().equals(c.getId()))
                    jumpMap.get(curCanvasId).add(j);
        }
    }

    @Override
    public String toString() {
        return "Project{" +
                "name='" + name + '\'' +
                ", views=" + views +
                ", canvases=" + canvases +
                ", jumps=" + jumps +
                ", renderingParams='" + renderingParams + '\'' +
                '}';
    }
}
