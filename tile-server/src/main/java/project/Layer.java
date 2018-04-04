package project;

/**
 * Created by wenbo on 4/3/18.
 */
public class Layer {

	private String transformId;
	Placement placement;
	String rendering;

	public String getTransformId() {
		return transformId;
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
				", placement=" + placement +
				", rendering='" + rendering + '\'' +
				'}';
	}
}
