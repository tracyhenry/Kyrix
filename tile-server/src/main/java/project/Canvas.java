package project;

import java.util.ArrayList;

/**
 * Created by wenbo on 1/4/18.
 */
public class Canvas {

	private String id;
	private int w;
	private int h;
	private double zoomInFactor, zoomOutFactor;
	private ArrayList<Transform> transforms;
	private ArrayList<Layer> layers;
	String axes;

	public String getId() {
		return id;
	}

	public int getW() {
		return w;
	}

	public int getH() {
		return h;
	}

	public double getZoomInFactor() {
		return zoomInFactor;
	}

	public double getZoomOutFactor() {
		return zoomOutFactor;
	}

	public ArrayList<Transform> getTransforms() {
		return transforms;
	}

	public ArrayList<Layer> getLayers() {
		return layers;
	}

	public String getAxes() {
		return axes;
	}

	public Transform getTransformById(String id) {

		for (Transform t : transforms)
			if (t.getId().equals(id))
				return t;

		return null;
	}

	@Override
	public String toString() {
		return "Canvas{" +
				"id='" + id + '\'' +
				", w=" + w +
				", h=" + h +
				", zoomInFactor=" + zoomInFactor +
				", zoomOutFactor=" + zoomOutFactor +
				", transforms=" + transforms +
				", layers=" + layers +
				", axes='" + axes + '\'' +
				'}';
	}
}
