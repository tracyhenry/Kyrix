package project;

/**
 * Created by wenbo on 1/4/18.
 */
public class Jump {

	private String sourceId;
	private String destId;
	private String newViewport;

	public String getSourceId() {
		return sourceId;
	}

	public String getDestId() {
		return destId;
	}

	public String getNewViewport() {
		return newViewport;
	}

	@Override
	public String toString() {
		return "Jump{" +
				"sourceId='" + sourceId + '\'' +
				", destId='" + destId + '\'' +
				", newViewport='" + newViewport + '\'' +
				'}';
	}
}
