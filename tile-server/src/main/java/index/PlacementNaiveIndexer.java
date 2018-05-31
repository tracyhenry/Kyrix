package index;

import com.coveo.nashorn_modules.FilesystemFolder;
import com.coveo.nashorn_modules.Require;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import main.Config;
import main.DbConnector;
import main.Main;
import project.*;

import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import java.io.File;
import java.sql.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by wenbo on 1/12/18.
 */
public class PlacementNaiveIndexer extends Indexer {

	private Project project;
	private Statement kyrix_stmt;

	public PlacementNaiveIndexer() throws SQLException, ClassNotFoundException, ScriptException, NoSuchMethodException {

		project = Main.getProject();
		kyrix_stmt = DbConnector.getStmtByDbName(Config.databaseName);
	}

	@Override
	public void precompute() throws SQLException,
			ClassNotFoundException,
			ScriptException,
			NoSuchMethodException {

		System.out.println("Precomputing...");
		String projectName = project.getName();
		// for each canvas and for each layer
		// step 0, create a table storing query result and bounding boxes
		// Step 1, run whole query of the data transform
		// Step 2, run data transforms
		// Step 3, calculate bounding box
		// Step 4, insert tuples and their bboxes
		for (Canvas c : project.getCanvases())
			for (int layer_id = 0; layer_id < c.getLayers().size(); layer_id ++) {

				Layer l = c.getLayers().get(layer_id);

				// step 0: create a table for storing bboxes
				Transform trans = c.getTransformById(l.getTransformId());
				// drop table if exists
				String sql = "drop table if exists " + "bbox_" + projectName + "_" + c.getId() + "layer" + layer_id + ";";
				kyrix_stmt.executeUpdate(sql);

				// create table
				sql = "create table bbox_" + projectName + "_" + c.getId() + "layer" + layer_id + " (";
				for (int i = 0; i < trans.getColumnNames().size(); i ++)
					sql += trans.getColumnNames().get(i) + " text, ";
				sql += "cx double, cy double, minx double, miny double, maxx double, maxy double);";
				kyrix_stmt.executeUpdate(sql);	// create table

				// if this is an empty layer, continue
				if (trans.getDb().equals(""))
					continue;

				// step 1: getting sql query result (raw data)
				ArrayList<ArrayList<String>> sqlQueryResults = DbConnector.getQueryResult(trans.getDb(), trans.getQuery());

				// step 2: run data transform on raw data
				// step 2(a): setting up nashorn env
				NashornScriptEngine engine = (NashornScriptEngine) new ScriptEngineManager()
						.getEngineByName("nashorn");
				FilesystemFolder rootFolder = FilesystemFolder.create(new File(Config.d3Dir), "UTF-8");
				Require.enable(engine, rootFolder);

				// step 2(b): register the data transform function with nashorn
				String script = "var d3 = require('d3-scale');\n"; // TODO: let users specify all required d3 libraries.
				script += "var trans = " + trans.getTransformFunc() + ";\n";
				engine.eval(script);

				// step 2(c): run the data transform function over the sql query result
				ArrayList<ArrayList<String>> transformResults = new ArrayList<>();
				for (int i = 0; i < sqlQueryResults.size(); i ++) {	//TODO: distinguish between separable and non-separable cases
					String[] curRowObjects = (String[]) engine	// TODO: figure out why row.slice does not work. learn more about nashorn types
							.invokeFunction("trans", sqlQueryResults.get(i), c.getW(), c.getH());
					ArrayList<String> curRow = new ArrayList<>();
					for (int j = 0; j < curRowObjects.length; j ++)
						curRow.add(curRowObjects[j].toString());

					transformResults.add(curRow);
				}

				// step 2(d): construct a column name to column index mapping table
				Map<String, Integer> colName2Id = new HashMap<>();
				for (int i = 0; i < trans.getColumnNames().size(); i ++)
					colName2Id.put(trans.getColumnNames().get(i), i);

				// step 3: calculating bounding boxes
				ArrayList<ArrayList<Double>> bboxes = new ArrayList<>();
				if (! l.isStatic())	{
					Placement p = l.getPlacement();
					String centroid_x = p.getCentroid_x();
					String centroid_y = p.getCentroid_y();
					String width_func = p.getWidth();
					String height_func = p.getHeight();

					for (int i = 0; i < transformResults.size(); i ++) {

						double centroid_x_dbl, centroid_y_dbl;
						double width_dbl, height_dbl;
						ArrayList<String> curRow = transformResults.get(i);

						// centroid_x
						if (centroid_x.substring(0, 3).equals("con"))
							centroid_x_dbl = Double.parseDouble(centroid_x.substring(4));
						else {
							String curColName = centroid_x.substring(4);
							int curColId = colName2Id.get(curColName);
							centroid_x_dbl = Double.parseDouble(curRow.get(curColId));
						}

						// centroid_y
						if (centroid_y.substring(0, 3).equals("con"))
							centroid_y_dbl = Double.parseDouble(centroid_y.substring(4));
						else {
							String curColName = centroid_y.substring(4);
							int curColId = colName2Id.get(curColName);
							centroid_y_dbl = Double.parseDouble(curRow.get(curColId));
						}

						// width
						if (width_func.substring(0, 3).equals("con"))
							width_dbl = Double.parseDouble(width_func.substring(4));
						else {
							String curColName = width_func.substring(4);
							int curColId = colName2Id.get(curColName);
							width_dbl = Double.parseDouble(curRow.get(curColId));
						}

						// height
						if (height_func.substring(0, 3).equals("con"))
							height_dbl = Double.parseDouble(height_func.substring(4));
						else {
							String curColName = height_func.substring(4);
							int curColId = colName2Id.get(curColName);
							height_dbl = Double.parseDouble(curRow.get(curColId));
						}

						ArrayList<Double> curBbox = new ArrayList<>();
						curBbox.add(centroid_x_dbl);	// cx
						curBbox.add(centroid_y_dbl);	// cy
						curBbox.add(centroid_x_dbl - width_dbl / 2.0);	// min x
						curBbox.add(centroid_y_dbl - height_dbl / 2.0);	// min y
						curBbox.add(centroid_x_dbl + width_dbl / 2.0);	// max x
						curBbox.add(centroid_y_dbl + height_dbl / 2.0);	// max y
						bboxes.add(curBbox);
					}
				}

				// step 4: insert into the bbox table
				// and index on the last 4 columns

				// TODO: prepared statement here
				// insert tuples
				for (int i = 0; i < transformResults.size(); i ++) {
					sql = "insert into bbox_" + projectName + "_" + c.getId() + "layer" + layer_id + " values (";
					ArrayList<String> curRow = transformResults.get(i);
					for (int j = 0; j < curRow.size(); j ++)
						sql += "'" + curRow.get(j).replaceAll("\'", "\\\\'") + "', ";
					for (int j = 0; j < 6; j ++) {
						if (l.isStatic())
							sql += "0";
						else
							sql += String.valueOf(bboxes.get(i).get(j));
						if (j < 5)
							sql += ",";
					}
					sql += ");";
					kyrix_stmt.executeUpdate(sql);
				}

				// build index
				try {
					sql = "create index bbox_" + projectName + "_" + c.getId() + "layer" + layer_id + "_indx on bbox_"
							+ projectName + "_" + c.getId() + "layer" + layer_id
							+ "(minx, miny, maxx, maxy);";
					kyrix_stmt.executeUpdate(sql);
				} catch (Exception e) {}
			}

		kyrix_stmt.close();
		System.out.println("Done precomputing!");
	}
}
