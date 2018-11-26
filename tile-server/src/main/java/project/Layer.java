package project;

/**
 * Created by wenbo on 4/3/18.
 */
public class Layer {

	private String transformId;
	private boolean isStatic;
	private boolean fisheye;
	private Placement placement;
	private String rendering;

	public String getTransformId() {
		return transformId;
	}

	public boolean isStatic() {
		return isStatic;
	}

	public boolean fisheye() {
		return fisheye;
	}

	public Placement getPlacement() {
		return placement;
	}

	public String getRendering() {
		return rendering;
	}

	@Override
	public String toString() {
		return "Layer{" +
				"transformId='" + transformId + '\'' +
				", isStatic=" + isStatic +
				", fisheye=" + fisheye +
				", placement=" + placement +
				", rendering='" + rendering + '\'' +
				'}';
	}
}
