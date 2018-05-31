package project;

/**
 * Created by wenbo on 1/4/18.
 */
public class Jump {

	private String sourceId;
	private String destId;
	private int layerId;
	private String newViewports;
	private String newPredicates;
	private String type;
	private String name;

	public String getSourceId() {
		return sourceId;
	}

	public String getDestId() {
		return destId;
	}

	public int getLayerId() {
		return layerId;
	}

	public String getType() {
		return type;
	}

	public String getNewViewports() {
		return newViewports;
	}

	public String getNewPredicates() {
		return newPredicates;
	}

	public String getName() {
		return name;
	}

	@Override
	public String toString() {
		return "Jump{" +
				"sourceId='" + sourceId + '\'' +
				", destId='" + destId + '\'' +
				", layerId=" + layerId +
				", newViewports='" + newViewports + '\'' +
				", newPredicates='" + newPredicates + '\'' +
				", type='" + type + '\'' +
				", name='" + name + '\'' +
				'}';
	}
}
