package project;

/**
 * Created by wenbo on 1/4/18.
 */
public class Jump {

	private String sourceId;
	private String destId;
	private String selector;
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

	public String getSelector() {
		return selector;
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
				", selector='" + selector + '\'' +
				", newViewports='" + newViewports + '\'' +
				", newPredicates='" + newPredicates + '\'' +
				", type='" + type + '\'' +
				", name='" + name + '\'' +
				'}';
	}
}
