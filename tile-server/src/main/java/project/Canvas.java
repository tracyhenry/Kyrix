package project;

import java.util.ArrayList;

/**
 * Created by wenbo on 1/4/18.
 */
public class Canvas {

	private String id;
	private int w;
	private int h;
	private double zoomInFactorX, zoomInFactorY;
	private double zoomOutFactorX, zoomOutFactorY;
	private ArrayList<Transform> transforms;
	private ArrayList<Layer> layers;
	String axes;
	String staticTrim;
	boolean staticTrimFirst;

	public String getId() {
		return id;
	}

	public int getW() {
		return w;
	}

	public int getH() {
		return h;
	}

	public double getZoomInFactorX() {
		return zoomInFactorX;
	}

	public double getZoomInFactorY() {
		return zoomInFactorY;
	}

	public double getZoomOutFactorX() {
		return zoomOutFactorX;
	}

	public double getZoomOutFactorY() {
		return zoomOutFactorY;
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

	public String getStaticTrim() {
		return staticTrim;
	}

	public boolean isStaticTrimFirst() {
		return staticTrimFirst;
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
				", zoomInFactorX=" + zoomInFactorX +
				", zoomInFactorY=" + zoomInFactorY +
				", zoomOutFactorX=" + zoomOutFactorX +
				", zoomOutFactorY=" + zoomOutFactorY +
				", transforms=" + transforms +
				", layers=" + layers +
				", axes='" + axes + '\'' +
				", staticTrim='" + staticTrim + '\'' +
				", staticTrimFirst=" + staticTrimFirst +
				'}';
	}
}
