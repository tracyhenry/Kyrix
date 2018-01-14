package project;

/**
 * Created by wenbo on 1/4/18.
 */
public class Canvas {

	private String id;
	private int w;
	private int h;
	private String query;
	private String db;
	private Placement placement;
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
		return h;
	}

	public String getQuery() {
		return query;
	}

	public String getDb() {
		return db;
	}

	public Placement getPlacement() {
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
		return "Canvas{" +
				"id='" + id + '\'' +
				", w=" + w +
				", h=" + h +
				", query='" + query + '\'' +
				", db='" + db + '\'' +
				", placement='" + placement + '\'' +
				", transform='" + transform + '\'' +
				", rendering='" + rendering + '\'' +
				", separable=" + separable +
				'}';
	}
}
