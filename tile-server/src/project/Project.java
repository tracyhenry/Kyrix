package project;

import java.util.ArrayList;

/**
 * Created by wenbo on 1/4/18.
 */
public class Project {

	// TODO switch to maven
	// TODO add gson dependency

	// fields
	private String name;
	private int viewportWidth;
	private int viewportHeight;
	private String initialCanvasId;
	private int initialViewportX;
	private int initialViewportY;
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

	public ArrayList<ArrayList<String>> getLayeredCanvases() {
		return layeredCanvases;
	}

	public ArrayList<Canvas> getCanvases() {
		return canvases;
	}

	public ArrayList<Jump> getJumps() {
		return jumps;
	}

	@Override
	public String toString() {
		return name
				+ " " + canvases.toString()
				+ " " + layeredCanvases.toString() + "\n";
	}
}
