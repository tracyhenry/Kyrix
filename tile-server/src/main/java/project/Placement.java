package project;

/**
 * Created by wenbo on 1/12/18.
 */
public class Placement {

	private String centroid_x;
	private String centroid_y;
	private String width;
	private String height;
	private String cx_col;
	private String cy_col;
	private String width_col;
	private String height_col;

	public String getCentroid_x() {
		return centroid_x;
	}

	public String getCentroid_y() {
		return centroid_y;
	}

	public String getWidth() {
		return width;
	}

	public String getHeight() {
		return height;
	}

	public String getCx_col() {
		return cx_col;
	}

	public String getCy_col() {
		return cy_col;
	}

	public String getWidth_col() {
		return width_col;
	}

	public String getHeight_col() {
		return height_col;
	}

	@Override
	public String toString() {
		return "Placement{" +
				"centroid_x='" + centroid_x + '\'' +
				", centroid_y='" + centroid_y + '\'' +
				", width='" + width + '\'' +
				", height='" + height + '\'' +
				", cx_col='" + cx_col + '\'' +
				", cy_col='" + cy_col + '\'' +
				", width_col='" + width_col + '\'' +
				", height_col='" + height_col + '\'' +
				'}';
	}
}
