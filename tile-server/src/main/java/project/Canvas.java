package project;

import java.util.ArrayList;

/**
 * Created by wenbo on 1/4/18.
 */
public class Canvas {

	private String id;
	private int w;
	private int h;
	private ArrayList<Transform> transforms;
	private ArrayList<Layer> layers;

	public String getId() {
		return id;
	}

	public int getW() {
		return w;
	}

	public int getH() {
		return h;
	}

	public ArrayList<Transform> getTransforms() {
		return transforms;
	}

	public ArrayList<Layer> getLayers() {
		return layers;
	}

	@Override
	public String toString() {
		return "Canvas{" +
				"id='" + id + '\'' +
				", w=" + w +
				", h=" + h +
				", transforms=" + transforms +
				", layers=" + layers +
				'}';
	}
}
