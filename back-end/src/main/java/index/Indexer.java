package index;

import com.coveo.nashorn_modules.FilesystemFolder;
import com.coveo.nashorn_modules.Require;
import jdk.nashorn.api.scripting.JSObject;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.Main;
import project.Canvas;
import project.Layer;
import project.Placement;
import box.Box;

import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import java.io.File;
import java.io.Serializable;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by wenbo on 12/30/18.
 */
public abstract class Indexer implements Serializable {

    // abstract methods
    public abstract void createMV(Canvas c, int layerId) throws Exception;
    public ArrayList<ArrayList<String>> getDataFromRegion(Canvas c, int layerId, String regionWKT, String predicate) throws Exception {
	// cannot be abstract because of the override below
	throw new Exception("getDataFromRegion not implemented?!");
    }
    public ArrayList<ArrayList<String>> getDataFromRegion(Canvas c, int layerId, String regionWKT, String predicate, Box newBox, Box oldBox) throws Exception {
	// for backwards compatibility, just drop the boxes and call the underlying
	return getDataFromRegion(c, layerId, regionWKT, predicate);
    }
    public abstract ArrayList<ArrayList<String>> getDataFromTile(Canvas c, int layerId, int minx, int miny, String predicate) throws Exception;

    // associate each layer with a proper indexer
    public static void associateIndexer() throws Exception {
        for (Canvas c : Main.getProject().getCanvases())
            for (int layerId = 0; layerId < c.getLayers().size(); layerId ++) {
                Indexer indexer = null;
                if (Config.database == Config.Database.PSQL ||
		    Config.database == Config.Database.CITUS) {
		    boolean isCitus = (Config.database == Config.Database.CITUS);
                    if (Config.indexingScheme == Config.IndexingScheme.SPATIAL_INDEX)
                        indexer = PsqlSpatialIndexer.getInstance(isCitus);
                    else if (Config.indexingScheme == Config.IndexingScheme.TILE_INDEX)
                        indexer = PsqlTileIndexer.getInstance(isCitus);
                    else if (Config.indexingScheme == Config.IndexingScheme.NATIVEBOX_INDEX)
                        indexer = PsqlNativeBoxIndexer.getInstance(isCitus);
                }
                else if (Config.database == Config.Database.MYSQL) {
                    if (Config.indexingScheme == Config.IndexingScheme.SPATIAL_INDEX)
                        indexer = MysqlSpatialIndexer.getInstance();
                    else if (Config.indexingScheme == Config.indexingScheme.TILE_INDEX)
                        indexer = MysqlTileIndexer.getInstance();
                    else if (Config.indexingScheme == Config.IndexingScheme.NATIVEBOX_INDEX)
                        throw new Exception("NATIVEBOX_INDEX not supported for dbtype MYSQL");
                }
                c.getLayers().get(layerId).setIndexer(indexer);
            }
    }

    // precompute
    public static void precompute() throws Exception {

        System.out.println("Precomputing...");

        associateIndexer();
        for (Canvas c : Main.getProject().getCanvases())
            for (int layerId = 0; layerId < c.getLayers().size(); layerId ++)
                c.getLayers().get(layerId).getIndexer().createMV(c, layerId);

        System.out.println("Done precomputing!");
    }

    // common static methods used by child classes
    protected static NashornScriptEngine setupNashorn(String transformFunc) throws ScriptException {

        NashornScriptEngine engine = (NashornScriptEngine) new ScriptEngineManager()
                .getEngineByName("nashorn");
        FilesystemFolder rootFolder = FilesystemFolder.create(new File(Config.d3Dir), "UTF-8");
        Require.enable(engine, rootFolder);

        // register the data transform function with nashorn
        String script = "var d3 = require('d3');\n"; // TODO: let users specify all required d3 libraries.
        script += "var trans = " + transformFunc + ";\n";
        engine.eval(script);

        // get rendering parameters
        engine.put("renderingParams", Main.getProject().getRenderingParams());

        return engine;
    }

    // run the transformed function on a row to get a transformed row
    protected static ArrayList<String> getTransformedRow(Canvas c, ArrayList<String> row, NashornScriptEngine engine)
            throws ScriptException, NoSuchMethodException {

        // TODO: figure out why row.slice does not work. learn more about nashorn types
        ArrayList<String> transRow = new ArrayList<>();
        JSObject renderingParamsObj = (JSObject) engine.eval("JSON.parse(renderingParams)");
        String[] strArray = (String[]) engine
                .invokeFunction("trans", row, c.getW(), c.getH(), renderingParamsObj);
        for (int i = 0; i < strArray.length; i ++)
            transRow.add(strArray[i]);

        return transRow;
    }

    // calculate bounding box indexes for a given row in a given layer
    static Map<String, Integer> colName2Id = null;
    static ArrayList<Double> bbox = null;
    static double centroid_x_dbl = -1.0, centroid_y_dbl = -1.0;
    static int curColId_x, curColId_y, curColId_w, curColId_h;
    static double width_dbl = -1.0, height_dbl = -1.0;
    protected static ArrayList<Double> getBboxCoordinates(Layer l, ArrayList<String> row) {

        if (l.isStatic()) {
	    if (bbox == null) {
		bbox = new ArrayList<>(6);
		for (int i = 0; i < 6; i ++)
		    bbox.set(i, 0.0);
	    }
	    return bbox;
	}

	// one-time initialization
	if (bbox == null) {
	    bbox = new ArrayList<>(6);
	    colName2Id = new HashMap();
	    // construct a column name to column index mapping table
	    for (int i = 0; i < l.getTransform().getColumnNames().size(); i ++)
		colName2Id.put(l.getTransform().getColumnNames().get(i), i);
	    // placement stuff
	    Placement p = l.getPlacement();
	    String centroid_x = p.getCentroid_x();
	    String centroid_y = p.getCentroid_y();
	    String width_func = p.getWidth();
	    String height_func = p.getHeight();
	    // centroid_x
	    if (centroid_x.substring(0, 4).equals("full"))
		centroid_x_dbl = 0;
	    else if (centroid_x.substring(0, 3).equals("con"))
		centroid_x_dbl = Double.parseDouble(centroid_x.substring(4));
	    else
		curColId_x = colName2Id.get(centroid_x.substring(4));

            // centroid_y
            if (centroid_y.substring(0, 4).equals("full"))
                centroid_y_dbl = 0;
            else if (centroid_y.substring(0, 3).equals("con"))
                centroid_y_dbl = Double.parseDouble(centroid_y.substring(4));
	    else
		curColId_y = colName2Id.get(centroid_y.substring(4));

            // width
            if (width_func.substring(0, 4).equals("full"))
                width_dbl = Double.MAX_VALUE;
            else if (width_func.substring(0, 3).equals("con"))
                width_dbl = Double.parseDouble(width_func.substring(4));
	    else
		curColId_w = colName2Id.get(width_func.substring(4));

            // height
            if (height_func.substring(0, 4).equals("full"))
                height_dbl = Double.MAX_VALUE;
            else if (height_func.substring(0, 3).equals("con"))
                height_dbl = Double.parseDouble(height_func.substring(4));
	    else
		curColId_h = colName2Id.get(height_func.substring(4));
	}

	double my_centroid_x_dbl = (centroid_x_dbl >= 0.0) ? centroid_x_dbl : Double.parseDouble(row.get(curColId_x));
	double my_centroid_y_dbl = (centroid_y_dbl >= 0.0) ? centroid_y_dbl : Double.parseDouble(row.get(curColId_y));
	double my_width_dbl = (width_dbl > 0.0) ? width_dbl : Double.parseDouble(row.get(curColId_w));
	double my_height_dbl = (height_dbl > 0.0) ? height_dbl : Double.parseDouble(row.get(curColId_h));

	bbox.set(0, my_centroid_x_dbl);	// cx
	bbox.set(1, my_centroid_y_dbl);	// cy
	bbox.set(2, my_centroid_x_dbl - my_width_dbl / 2.0);	// min x
	bbox.set(3, my_centroid_y_dbl - my_height_dbl / 2.0);	// min y
	bbox.set(4, my_centroid_x_dbl + my_width_dbl / 2.0);	// max x
	bbox.set(5, my_centroid_y_dbl + my_height_dbl / 2.0);	// max y

        return bbox;
    }

    protected static String getPolygonText(double minx, double miny, double maxx, double maxy) {

        String polygonText = "Polygon((";
        polygonText += String.valueOf(minx) + " " + String.valueOf(miny) + ","
                + String.valueOf(maxx) + " " + String.valueOf(miny)
                + "," + String.valueOf(maxx) + " " + String.valueOf(maxy)
                + "," + String.valueOf(minx) + " " + String.valueOf(maxy)
                + "," + String.valueOf(minx) + " " + String.valueOf(miny);
        polygonText += "))";

        return polygonText;
    }
}
