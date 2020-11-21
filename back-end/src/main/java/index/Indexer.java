package index;

import box.Box;
import com.coveo.nashorn_modules.FilesystemFolder;
import com.coveo.nashorn_modules.Require;
import java.io.File;
import java.io.Serializable;
import java.lang.reflect.Method;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import jdk.nashorn.api.scripting.JSObject;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Layer;
import project.Placement;
import project.SSV;

/** Created by wenbo on 12/30/18. */
public abstract class Indexer implements Serializable {

    // abstract methods
    public abstract void createMV(Canvas c, int layerId) throws Exception;

    public abstract ArrayList<ArrayList<String>> getDataFromRegion(
            Canvas c, int layerId, String regionWKT, String predicate, Box newBox, Box oldBox)
            throws Exception;

    public abstract ArrayList<ArrayList<String>> getDataFromTile(
            Canvas c, int layerId, int minx, int miny, String predicate) throws Exception;

    public abstract String getStaticDataQuery(Canvas c, int layerId, String predicate)
            throws Exception;

    // associate each layer with a proper indexer
    public static void associateIndexer() throws Exception {
        for (Canvas c : Main.getProject().getCanvases())
            for (int layerId = 0; layerId < c.getLayers().size(); layerId++) {

                // note that if the indexer type is set in the compiler
                // it overrides the settings in Config.java (or config.yaml in the future)
                Layer l = c.getLayers().get(layerId);
                String indexerType = l.getIndexerType();
                // if the indexerType is empty or wrong, indexer will be null
                Indexer indexer = getIndexerByType(indexerType);

                // determine indexer for this layer when the indexer is not set in the compiler
                if (indexer == null) {
                    if (Config.database == Config.Database.PSQL) {
                        if (Config.indexingScheme == Config.IndexingScheme.POSTGIS_SPATIAL_INDEX)
                            indexer = PsqlSpatialIndexer.getInstance();
                        else if (Config.indexingScheme == Config.IndexingScheme.TILE_INDEX)
                            indexer = PsqlTileIndexer.getInstance();
                        else if (Config.indexingScheme
                                == Config.IndexingScheme.PSQL_NATIVEBOX_INDEX)
                            indexer = PsqlNativeBoxIndexer.getInstance();
                        // indexer = PsqlPlv8Indexer.getInstance();
                        else if (Config.indexingScheme
                                == Config.IndexingScheme.PSQL_NATIVECUBE_INDEX)
                            indexer = PsqlCubeSpatialIndexer.getInstance();
                        else
                            throw new Exception(
                                    "Index type "
                                            + Config.indexingScheme.toString()
                                            + " not supported for PSQL.");
                    } else if (Config.database == Config.Database.CITUS)
                        indexer = PsqlCitusIndexer.getInstance();
                    else if (Config.database == Config.Database.MYSQL) {
                        if (l.getIndexerType().equals("SSVInMemoryIndexer"))
                            throw new Exception("SSV is not supported by MySQL indexers.");
                        else if (l.getIndexerType().equals("PsqlPredicatedTableIndexer"))
                            throw new Exception(
                                    "PredicatedTable is not supported by MySQL indexers.");
                        else if (Config.indexingScheme == Config.IndexingScheme.MYSQL_SPATIAL_INDEX)
                            indexer = MysqlSpatialIndexer.getInstance();
                        else if (Config.indexingScheme == Config.indexingScheme.TILE_INDEX)
                            indexer = MysqlTileIndexer.getInstance();
                        else
                            throw new Exception(
                                    "Index type "
                                            + Config.indexingScheme.toString()
                                            + "not supported for MySQL.");
                    }
                }

                // associate indexer
                l.setIndexer(indexer);
                l.setIndexerType(indexer.getClass().getSimpleName());

                // for geo ssv layers, add kyrix_geo_x/kyrix_geo_y columns first
                // so that getTransform().getColumnNames() below can find them
                if (!l.getSSVId().isEmpty()) {
                    int ssvIndex =
                            Integer.valueOf(l.getSSVId().substring(0, l.getSSVId().indexOf("_")));
                    SSV curSSV = Main.getProject().getSsvs().get(ssvIndex);
                    // check if geo component is specified
                    if (curSSV.getGeoInitialLevel() >= 0) {
                        String rawTable = curSSV.getRawTable();
                        String db = curSSV.getDb();
                        Statement rawDbStmt = DbConnector.getStmtByDbName(db);
                        String sql =
                                "ALTER TABLE "
                                        + rawTable
                                        + " ADD COLUMN IF NOT EXISTS kyrix_geo_x float;";
                        rawDbStmt.executeUpdate(sql);
                        sql =
                                "ALTER TABLE "
                                        + rawTable
                                        + " ADD COLUMN IF NOT EXISTS kyrix_geo_y float;";
                        rawDbStmt.executeUpdate(sql);
                    }
                }

                // pre-run getColumnNames, see issue #84: github.com/tracyhenry/kyrix/issues/84
                l.getTransform().getColumnNames();
            }
    }

    public static Indexer getIndexerByType(String type) throws Exception {
        if (type.isEmpty() || type.equals("PsqlNativeBoxIndexer")) return null;
        Class c = Class.forName("index." + type);
        Method m = c.getMethod("getInstance");
        return (Indexer) m.invoke(null);
    }

    // precompute
    public static void precompute() throws Exception {

        System.out.println("Precomputing...");

        associateIndexer();
        long indexingStartTime = System.currentTimeMillis();
        for (Canvas c : Main.getProject().getCanvases()) {
            for (int layerId = 0; layerId < c.getLayers().size(); layerId++) {
                c.getLayers().get(layerId).getIndexer().createMV(c, layerId);
            }
        }

        System.out.println(
                "Indexing took: " + (System.currentTimeMillis() - indexingStartTime) / 1000 + "s.");
        System.out.println("Done precomputing!");
    }

    // common static methods used by child classes
    protected static NashornScriptEngine setupNashorn(String transformFunc) throws ScriptException {

        NashornScriptEngine engine =
                (NashornScriptEngine) new ScriptEngineManager().getEngineByName("nashorn");
        FilesystemFolder rootFolder = FilesystemFolder.create(new File(Config.d3Dir), "UTF-8");
        Require.enable(engine, rootFolder);

        // register the data transform function with nashorn
        String script =
                "var d3 = require('d3');\n"; // TODO: let users specify all required d3 libraries.
        script += "var trans = " + transformFunc + ";\n";
        engine.eval(script);

        // get rendering parameters
        engine.put("renderingParams", Main.getProject().getRenderingParams());

        return engine;
    }

    // run the transformed function on a row to get a transformed row
    protected static ArrayList<String> getTransformedRow(
            Canvas c, ArrayList<String> row, NashornScriptEngine engine)
            throws ScriptException, NoSuchMethodException {

        // TODO: figure out why row.slice does not work. learn more about nashorn types
        ArrayList<String> transRow = new ArrayList<>();
        JSObject renderingParamsObj = (JSObject) engine.eval("JSON.parse(renderingParams)");
        String[] strArray =
                (String[])
                        engine.invokeFunction("trans", row, c.getW(), c.getH(), renderingParamsObj);
        for (int i = 0; i < strArray.length; i++) transRow.add(strArray[i]);

        return transRow;
    }

    // calculate bounding box indexes for a given row in a given layer
    protected static ArrayList<Double> getBboxCoordinates(Layer l, ArrayList<String> row)
            throws SQLException, ClassNotFoundException {

        // array to return
        ArrayList<Double> bbox = new ArrayList<>();

        // construct a column name to column index mapping table
        Map<String, Integer> colName2Id = new HashMap<>();
        for (int i = 0; i < l.getTransform().getColumnNames().size(); i++)
            colName2Id.put(l.getTransform().getColumnNames().get(i), i);

        // placement stuff
        Placement p = (l.isStatic() ? null : l.getPlacement());
        String centroid_x = (l.isStatic() ? null : p.getCentroid_x());
        String centroid_y = (l.isStatic() ? null : p.getCentroid_y());
        String width_func = (l.isStatic() ? null : p.getWidth());
        String height_func = (l.isStatic() ? null : p.getHeight());

        // calculate bounding box
        if (!l.isStatic()) {
            double centroid_x_dbl, centroid_y_dbl;
            double width_dbl, height_dbl;

            // centroid_x
            if (centroid_x.substring(0, 4).equals("full")) centroid_x_dbl = 0;
            else if (centroid_x.substring(0, 3).equals("con"))
                centroid_x_dbl = Double.parseDouble(centroid_x.substring(4));
            else {
                String curColName = centroid_x.substring(4); // col:<name>
                int curColId = colName2Id.get(curColName);
                centroid_x_dbl = Double.parseDouble(row.get(curColId));
            }

            // centroid_y
            if (centroid_y.substring(0, 4).equals("full")) centroid_y_dbl = 0;
            else if (centroid_y.substring(0, 3).equals("con"))
                centroid_y_dbl = Double.parseDouble(centroid_y.substring(4));
            else {
                String curColName = centroid_y.substring(4);
                int curColId = colName2Id.get(curColName);
                centroid_y_dbl = Double.parseDouble(row.get(curColId));
            }

            // width
            if (width_func.substring(0, 4).equals("full")) width_dbl = Integer.MAX_VALUE;
            else if (width_func.substring(0, 3).equals("con"))
                width_dbl = Double.parseDouble(width_func.substring(4));
            else {
                String curColName = width_func.substring(4);
                int curColId = colName2Id.get(curColName);
                width_dbl = Double.parseDouble(row.get(curColId));
            }

            // height
            if (height_func.substring(0, 4).equals("full")) height_dbl = Integer.MAX_VALUE;
            else if (height_func.substring(0, 3).equals("con"))
                height_dbl = Double.parseDouble(height_func.substring(4));
            else {
                String curColName = height_func.substring(4);
                int curColId = colName2Id.get(curColName);
                height_dbl = Double.parseDouble(row.get(curColId));
            }

            // get bounding box
            bbox.add(centroid_x_dbl); // cx
            bbox.add(centroid_y_dbl); // cy
            bbox.add(centroid_x_dbl - width_dbl / 2.0); // min x
            bbox.add(centroid_y_dbl - height_dbl / 2.0); // min y
            bbox.add(centroid_x_dbl + width_dbl / 2.0); // max x
            bbox.add(centroid_y_dbl + height_dbl / 2.0); // max y
        } else for (int i = 0; i < 6; i++) bbox.add(0.0);
        return bbox;
    }

    protected static String getPolygonText(double minx, double miny, double maxx, double maxy) {

        String polygonText = "Polygon((";
        polygonText +=
                String.valueOf(minx)
                        + " "
                        + String.valueOf(miny)
                        + ","
                        + String.valueOf(maxx)
                        + " "
                        + String.valueOf(miny)
                        + ","
                        + String.valueOf(maxx)
                        + " "
                        + String.valueOf(maxy)
                        + ","
                        + String.valueOf(minx)
                        + " "
                        + String.valueOf(maxy)
                        + ","
                        + String.valueOf(minx)
                        + " "
                        + String.valueOf(miny);
        polygonText += "))";

        return polygonText;
    }
}
