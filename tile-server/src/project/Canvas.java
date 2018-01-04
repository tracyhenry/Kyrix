package project;

import static sun.jvm.hotspot.code.CompressedStream.H;

/**
 * Created by wenbo on 1/4/18.
 */
public class Canvas {
	private String id;
	private int w;
	private int h;
	private String query;
	private String placement;
	private String transform;
	private String rendering;
	private boolean separable;

	public String getId() {
		return id;
	}

	public int getW() {
		return w;
	}

	public int getH() {
		return H;
	}

	public String getQuery() {
		return query;
	}

	public String getPlacement() {
		return placement;
	}

	public String getTransform() {
		return transform;
	}

	public String getRendering() {
		return rendering;
	}

	public boolean isSeparable() {
		return separable;
	}

	@Override
	public String toString() {
		return id
				+ " " + query
				+ " " + placement + "\n";
	}
}
