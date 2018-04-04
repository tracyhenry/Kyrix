package project;

import java.util.ArrayList;

/**
 * Created by wenbo on 4/3/18.
 */
public class Transform {

	private String id;
	private String query;
	private String db;
	private String transformFunc;
	private ArrayList<String> columnNames;
	private boolean separable;

	public String getId() {
		return id;
	}

	public String getQuery() {
		return query;
	}

	public String getDb() {
		return db;
	}

	public String getTransformFunc() {
		return transformFunc;
	}

	public boolean isSeparable() {
		return separable;
	}

	@Override
	public String toString() {
		return "Transform{" +
				"id='" + id + '\'' +
				", query='" + query + '\'' +
				", db='" + db + '\'' +
				", transformFunc='" + transformFunc + '\'' +
				", columnNames=" + columnNames +
				", separable=" + separable +
				'}';
	}
}
