package index;

import com.coveo.nashorn_modules.FilesystemFolder;
import com.coveo.nashorn_modules.Require;
import jdk.nashorn.api.scripting.JSObject;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.DbConnector;
import main.Main;
import project.*;

import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import java.io.File;
import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by wenbo on 1/12/18.
 */
public class boundingBoxIndexer extends Indexer {

	private Project project;
	private Statement kyrixStmt;

	public boundingBoxIndexer() throws SQLException, ClassNotFoundException, ScriptException, NoSuchMethodException {

		project = Main.getProject();
		kyrixStmt = DbConnector.getStmtByDbName(Config.databaseName);
	}

	@Override
	public void precompute() throws SQLException,
			ClassNotFoundException,
			ScriptException,
			NoSuchMethodException {

		System.out.println("Precomputing...");
		String projectName = project.getName();
		// for each canvas and for each layer
		// Step 0, create a table storing query result and bounding boxes
		// Step 1, set up nashorn environment
		// Step 2, for each tuple in the query result
		// Step 3,     run data transforms to get transformed tuple
		// Step 4,     calculate bounding box
		// Step 5,     insert this tuple and its bbox
		// Step 6, create spatial index
		for (Canvas c : project.getCanvases())
			for (int layer_id = 0; layer_id < c.getLayers().size(); layer_id ++) {

				Layer l = c.getLayers().get(layer_id);

				// step 0: create a table for storing bboxes
				Transform trans = c.getTransformById(l.getTransformId());
				// drop table if exists
				String sql = "drop table if exists " + "bbox_" + projectName + "_" + c.getId() + "layer" + layer_id + ";";
				kyrixStmt.executeUpdate(sql);

				// create table
				sql = "create table bbox_" + projectName + "_" + c.getId() + "layer" + layer_id + " (";
				for (int i = 0; i < trans.getColumnNames().size(); i ++)
					sql += trans.getColumnNames().get(i) + " mediumtext, ";
				sql += "cx double, cy double, minx double, miny double, maxx double, maxy double, geom polygon not null) engine=myisam;";
				kyrixStmt.executeUpdate(sql);	// create table

				// if this is an empty layer, continue
				if (trans.getDb().equals(""))
					continue;

				// step 1: set up nashorn environment, prepared statement, column name to id mapping
				NashornScriptEngine engine = (NashornScriptEngine) new ScriptEngineManager()
						.getEngineByName("nashorn");
				FilesystemFolder rootFolder = FilesystemFolder.create(new File(Config.d3Dir), "UTF-8");
				Require.enable(engine, rootFolder);

				// step 1(a): register the data transform function with nashorn
				String script = "var d3 = require('d3-scale');\n"; // TODO: let users specify all required d3 libraries.
				script += "var trans = " + trans.getTransformFunc() + ";\n";
				engine.eval(script);

				// step 1(b): get rendering parameters
				engine.put("renderingParams", project.getRenderingParams());
				JSObject renderingParamsObj = (JSObject) engine.eval("JSON.parse(renderingParams)");

				// step 1(c): construct a column name to column index mapping table
				Map<String, Integer> colName2Id = new HashMap<>();
				for (int i = 0; i < trans.getColumnNames().size(); i ++)
					colName2Id.put(trans.getColumnNames().get(i), i);

				// step 1(d): extract placement stuff
				Placement p = (l.isStatic() ? null : l.getPlacement());
				String centroid_x = (l.isStatic() ? null : p.getCentroid_x());
				String centroid_y = (l.isStatic() ? null : p.getCentroid_y());
				String width_func = (l.isStatic() ? null : p.getWidth());
				String height_func = (l.isStatic() ? null : p.getHeight());

				// step 2: looping through query results
				// TODO: distinguish between separable and non-separable cases
				ResultSet rs = DbConnector.getQueryResultIterator(trans.getDb(), trans.getQuery());
				int numColumn = rs.getMetaData().getColumnCount();
				int rowCount = 0;
				StringBuilder insSqlBuilder = new StringBuilder("insert into bbox_" + projectName + "_" + c.getId() + "layer" + layer_id + " values");

				while (rs.next()) {

					rowCount ++;

					//get raw row
					ArrayList<String> curRawRow = new ArrayList<>();
					for (int i = 1; i <= numColumn; i ++)
						curRawRow.add(rs.getString(i));

					// step 3: run transform function on this tuple
					String[] transformedStrArray = (String[]) engine	// TODO: figure out why row.slice does not work. learn more about nashorn types
							.invokeFunction("trans", curRawRow, c.getW(), c.getH(), renderingParamsObj);
					ArrayList<String> transformedRow = new ArrayList<>();
					for (int i = 0; i < transformedStrArray.length; i ++)
						transformedRow.add(transformedStrArray[i].toString());

					// step 4: calculate bounding boxes
					ArrayList<Double> curBbox = new ArrayList<>();
					if (! l.isStatic()) {
						double centroid_x_dbl, centroid_y_dbl;
						double width_dbl, height_dbl;

						// centroid_x
						if (centroid_x.substring(0, 3).equals("con"))
							centroid_x_dbl = Double.parseDouble(centroid_x.substring(4));
						else {
							String curColName = centroid_x.substring(4);
							int curColId = colName2Id.get(curColName);
							centroid_x_dbl = Double.parseDouble(transformedRow.get(curColId));
						}

						// centroid_y
						if (centroid_y.substring(0, 3).equals("con"))
							centroid_y_dbl = Double.parseDouble(centroid_y.substring(4));
						else {
							String curColName = centroid_y.substring(4);
							int curColId = colName2Id.get(curColName);
							centroid_y_dbl = Double.parseDouble(transformedRow.get(curColId));
						}

						// width
						if (width_func.substring(0, 3).equals("con"))
							width_dbl = Double.parseDouble(width_func.substring(4));
						else {
							String curColName = width_func.substring(4);
							int curColId = colName2Id.get(curColName);
							width_dbl = Double.parseDouble(transformedRow.get(curColId));
						}

						// height
						if (height_func.substring(0, 3).equals("con"))
							height_dbl = Double.parseDouble(height_func.substring(4));
						else {
							String curColName = height_func.substring(4);
							int curColId = colName2Id.get(curColName);
							height_dbl = Double.parseDouble(transformedRow.get(curColId));
						}

						// get bounding box
						curBbox.add(centroid_x_dbl);	// cx
						curBbox.add(centroid_y_dbl);	// cy
						curBbox.add(centroid_x_dbl - width_dbl / 2.0);	// min x
						curBbox.add(centroid_y_dbl - height_dbl / 2.0);	// min y
						curBbox.add(centroid_x_dbl + width_dbl / 2.0);	// max x
						curBbox.add(centroid_y_dbl + height_dbl / 2.0);	// max y
					}
					else
						for (int i = 0; i < 6; i ++)
							curBbox.add(0.0);

					// insert into bbox table
					if (insSqlBuilder.charAt(insSqlBuilder.length() - 1) == ')')
						insSqlBuilder.append(",(");
					else
						insSqlBuilder.append(" (");
					for (int i = 0; i < transformedRow.size(); i ++)
						insSqlBuilder.append("'" + transformedRow.get(i).replaceAll("\'", "\\\\'") + "', ");
					for (int i = 0; i < 6; i ++)
						insSqlBuilder.append(String.valueOf(curBbox.get(i)) + ", ");

					double minx, miny, maxx, maxy;
					minx = curBbox.get(2);
					miny = curBbox.get(3);
					maxx = curBbox.get(4);
					maxy = curBbox.get(5);

					insSqlBuilder.append("GeomFromText('Polygon((");
					insSqlBuilder.append(String.valueOf(minx) + " " + String.valueOf(miny) + "," + String.valueOf(maxx) + " " + String.valueOf(miny)
							+ "," + String.valueOf(maxx) + " " + String.valueOf(maxy) + "," + String.valueOf(minx) + " "
							+ String.valueOf(maxy) + "," + String.valueOf(minx) + " " + String.valueOf(miny));
					insSqlBuilder.append("))'))");

					if (rowCount % Config.bboxBatchSize == 0) {
						insSqlBuilder.append(";");
						kyrixStmt.executeUpdate(insSqlBuilder.toString());
						insSqlBuilder = new StringBuilder("insert into bbox_" + projectName + "_" + c.getId() + "layer" + layer_id + " values");
					}
				}
				rs.close();
				if (rowCount % Config.bboxBatchSize != 0) {
					insSqlBuilder.append(";");
					kyrixStmt.executeUpdate(insSqlBuilder.toString());
				}

				// build index
				try {
					sql = "ALTER TABLE bbox_" + projectName + "_" + c.getId() + "layer" + layer_id
							+ " ADD SPATIAL INDEX(geom);";
					kyrixStmt.executeUpdate(sql);
				} catch (Exception e) {}
			}

		kyrixStmt.close();
		System.out.println("Done precomputing!");
	}
}
