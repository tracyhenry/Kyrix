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
	private Map<String, ArrayList<Jump>> jumpMap;

	// JSON fields
	private String name;
	private int viewportWidth;
	private int viewportHeight;
	private String initialCanvasId;
	private int initialViewportX;
	private int initialViewportY;
	private String initialPredicate;
	private ArrayList<ArrayList<String>> layeredCanvases;
	private ArrayList<Canvas> canvases;
	private ArrayList<Jump> jumps;

	public String getName() {
		return name;
	}

	public int getViewportWidth() {
		return viewportWidth;
	}

	public int getViewportHeight() {
		return viewportHeight;
	}

	public String getInitialCanvasId() {
		return initialCanvasId;
	}

	public int getInitialViewportX() {
		return initialViewportX;
	}

	public int getInitialViewportY() {
		return initialViewportY;
	}

	public String getInitialPredicate() {
		return initialPredicate;
	}

	public ArrayList<ArrayList<String>> getLayeredCanvases() {
		return layeredCanvases;
	}

	public ArrayList<Canvas> getCanvases() {
		return canvases;
	}

	public ArrayList<Jump> getJumps() {
		return jumps;
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
				", viewportWidth=" + viewportWidth +
				", viewportHeight=" + viewportHeight +
				", initialCanvasId='" + initialCanvasId + '\'' +
				", initialViewportX=" + initialViewportX +
				", initialViewportY=" + initialViewportY +
				", initialPredicate=" + initialPredicate +
				", layeredCanvases=" + layeredCanvases +
				", canvases=" + canvases +
				", jumps=" + jumps +
				'}';
	}
}
