package project;

/**
 * Created by wenbo on 1/4/18.
 */
public class Jump {
	private String sourceId;
	private String destId;
	private String newViewport;
	private String newPredicate;

	public String getSourceId() {
		return sourceId;
	}

	public String getDestId() {
		return destId;
	}

	public String getNewViewport() {
		return newViewport;
	}

	public String getNewPredicate() {
		return newPredicate;
	}

	@Override
	public String toString() {
		return sourceId + " " + destId;

	}
}
