package project;

import java.util.ArrayList;

/**
 * Created by wenbo on 1/4/18.
 */
public class Jump {

	private String sourceId;
	private String destId;
	private ArrayList<String> newViewports;
	private ArrayList<String> newPredicates;

	public String getSourceId() {
		return sourceId;
	}

	public String getDestId() {
		return destId;
	}

	public ArrayList<String> getNewViewports() {
		return newViewports;
	}

	public ArrayList<String> getNewPredicates() {
		return newPredicates;
	}

	@Override
	public String toString() {
		return "Jump{" +
				"sourceId='" + sourceId + '\'' +
				", destId='" + destId + '\'' +
				", newViewports=" + newViewports +
				", newPredicates=" + newPredicates +
				'}';
	}
}
