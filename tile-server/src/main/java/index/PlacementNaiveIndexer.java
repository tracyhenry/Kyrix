package index;

import com.coveo.nashorn_modules.FilesystemFolder;
import com.coveo.nashorn_modules.Require;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Placement;
import project.Project;

import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import java.io.File;
import java.sql.*;
import java.util.ArrayList;

/**
 * Created by wenbo on 1/12/18.
 */
public class PlacementNaiveIndexer extends Indexer {

	private Project project;
	private Statement kyrix_stmt;

	public PlacementNaiveIndexer() throws SQLException, ClassNotFoundException {

		project = Main.getProject();
		kyrix_stmt = DbConnector.getStmtByDbName(Config.databaseName);
	}

	@Override
	public void precompute() throws SQLException,
			ClassNotFoundException,
			ScriptException,
			NoSuchMethodException {

		System.out.println("Precomputing...");
		// for each canvas,
		// Step 1, run whole query
		// Step 2, calculate bounding box
		// Step 3, construct a new table storing tuples and their bboxes
		for (Canvas c : project.getCanvases()) {

			// step 1: getting all tuples
			ArrayList<ArrayList<String>> tuples = new ArrayList<>();
			Statement curStmt = DbConnector.getStmtByDbName(c.getDb());
			ResultSet rs = curStmt.executeQuery(c.getQuery());
			ResultSetMetaData metaData = rs.getMetaData();
			int numColumn = rs.getMetaData().getColumnCount();
			while (rs.next()) {
				ArrayList<String> curRow = new ArrayList<>();
				for (int i = 1; i <= numColumn; i ++)
					curRow.add(rs.getString(i));
				tuples.add(curRow);
			}

			// step 2: calculating bounding boxes
			// step 2(a): setting up nashorn env
			NashornScriptEngine engine = (NashornScriptEngine) new ScriptEngineManager()
					.getEngineByName("nashorn");
			FilesystemFolder rootFolder = FilesystemFolder.create(new File(Config.d3Dir), "UTF-8");
			Require.enable(engine, rootFolder);

			// step 2(b): use nashorn to register javascript functions
			Placement p = c.getPlacement();
			String centroid_x = p.getCentroid_x();
			String centroid_y = p.getCentroid_y();
			String width_func = p.getWidth();
			String height_func = p.getHeight();
			String script = "var d3 = require('d3-scale');\n";
			script += "var centroid_x = " + centroid_x + ";\n";
			script += "var run_centroid_x = function (rows) {\n"
					+ "var ans = [];\n"
					+ "for (var i = 0; i < rows.length; i ++)\n"
					+ "	ans.push(centroid_x(rows[i]));\n"
					+ "return ans;};\n";
			script += "var centroid_y = " + centroid_y + ";\n";
			script += "var run_centroid_y = function (rows) {\n"
					+ "var ans = [];\n"
					+ "for (var i = 0; i < rows.length; i ++)\n"
					+ "	ans.push(centroid_y(rows[i]));\n"
					+ "return ans;};\n";
			script += "var width_func = " + width_func + ";\n";
			script += "var run_width_func = function (rows) {\n"
					+ "var ans = [];\n"
					+ "for (var i = 0; i < rows.length; i ++)\n"
					+ "	ans.push(width_func(rows[i]));\n"
					+ "return ans;};\n";
			script += "var height_func = " + height_func + ";\n";
			script += "var run_height_func = function (rows) {\n"
					+ "var ans = [];\n"
					+ "for (var i = 0; i < rows.length; i ++)\n"
					+ "	ans.push(height_func(rows[i]));\n"
					+ "return ans;};\n";
			engine.eval(script);

			// step 2(c): for each tuple calculating bboxes
			double[] centroid_xs = getBBoxValues(p.getCx_col().split(","),
					tuples,
					"run_centroid_x",
					engine,
					metaData);
			double[] centroid_ys = getBBoxValues(p.getCy_col().split(","),
					tuples,
					"run_centroid_y",
					engine,
					metaData);
			double[] widths = getBBoxValues(p.getWidth_col().split(","),
					tuples,
					"run_width_func",
					engine,
					metaData);
			double[] heights = getBBoxValues(p.getHeight_col().split(","),
					tuples,
					"run_height_func",
					engine,
					metaData);

			ArrayList<ArrayList<Double>> bboxes = new ArrayList<>();
			for (int i = 0; i < tuples.size(); i ++) {
				ArrayList<Double> curBbox = new ArrayList<>();
				curBbox.add(centroid_xs[i]);	// cx
				curBbox.add(centroid_ys[i]);	// cy
				curBbox.add(centroid_xs[i] - widths[i] / 2.0);	// min x
				curBbox.add(centroid_ys[i] - heights[i] / 2.0);	// min y
				curBbox.add(centroid_xs[i] + widths[i] / 2.0);	// max x
				curBbox.add(centroid_ys[i] + heights[i] / 2.0);	// max y
				bboxes.add(curBbox);
			}

			// step 3: create a new table storing the tuple 2D array
			// and index on the last 4 columns

			// drop table if exists
			String sql = "drop table if exists " + "bbox_" + c.getId() + ";";
			kyrix_stmt.executeUpdate(sql);

			// create table
			sql = "create table bbox_" + c.getId() + " (";
			for (int i = 1; i <= numColumn; i ++)
				sql += metaData.getColumnName(i) + " text, ";
			sql += "cx double, cy double, minx double, miny double, maxx double, maxy double);";
			kyrix_stmt.executeUpdate(sql);	// create table

			// TODO: prepared statement here
			// insert tuples
			for (int i = 0; i < tuples.size(); i ++) {
				sql = "insert into bbox_" + c.getId() + " values (";
				ArrayList<String> curTuple = tuples.get(i);
				for (int j = 0; j < curTuple.size(); j ++)
					sql += "'" + curTuple.get(j) + "', ";
				ArrayList<Double> curBbox = bboxes.get(i);
				for (int j = 0; j < curBbox.size(); j ++) {
					sql += String.valueOf(curBbox.get(j));
					if (j < curBbox.size() - 1)
						sql += ",";
				}
				sql += ");";
				kyrix_stmt.executeUpdate(sql);
			}

			// build index
			try {
				sql = "create index bbox_" + c.getId() + "_indx on bbox_" + c.getId()
						+ "(minx, miny, maxx, maxy);";
				kyrix_stmt.executeUpdate(sql);
			} catch (Exception e) {}
		}

		System.out.println("Done precomputing!");
	}

	/**
	 * get values for one of the 6 columns related to the bounding box
	 * @param columns the names of the columns specified by the user
	 * @param tuples the query result of the current canvas
	 * @param methodName the javascript method name for calculating this column
	 * @param engine the nashorn engine
	 * @param metaData metaData of the query result
	 * @return
	 * @throws SQLException
	 * @throws ScriptException
	 * @throws NoSuchMethodException
	 */
	private double[] getBBoxValues(String[] columns,
								   ArrayList<ArrayList<String>> tuples,
								   String methodName,
								   NashornScriptEngine engine,
								   ResultSetMetaData metaData)
			throws SQLException, ScriptException, NoSuchMethodException {

		int numColumn = metaData.getColumnCount();
		ArrayList<ArrayList<String>> rows = new ArrayList<>();
		rows.clear();

		for (int i = 0; i < tuples.size(); i ++) {
			ArrayList<String> row = new ArrayList<>();
			for (int j = 1; j <= numColumn; j ++) {
				boolean exist = false;
				for (String columnName : columns)
					if (metaData.getColumnName(j).equals(columnName)) {
						exist = true;
						break;
					}
				if (! exist)
					continue;
				row.add(tuples.get(i).get(j - 1));
			}
			rows.add(row);
		}

		// invoke method
		double[] result = ((ScriptObjectMirror) engine
				.invokeFunction(methodName, rows))
				.to(double[].class);
		return result;
	}
}
