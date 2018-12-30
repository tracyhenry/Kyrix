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
public class Indexer {

    protected Project project;
    protected Statement bboxStmt, tileStmt;

    public Indexer() throws SQLException, ClassNotFoundException, ScriptException, NoSuchMethodException {

        project = Main.getProject();
        bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);
        tileStmt = DbConnector.getStmtByDbName(Config.databaseName);
    }

    public void precompute() throws SQLException,
            ClassNotFoundException,
            ScriptException,
            NoSuchMethodException {

        System.out.println("Precomputing...");
        String projectName = project.getName();
        if (Config.database == Config.Database.PSQL){
            String psql = "CREATE EXTENSION if not exists postgis;";
            bboxStmt.executeUpdate(psql);
            psql = "CREATE EXTENSION if not exists postgis_topology;";
            bboxStmt.executeUpdate(psql);
        }
        // for each canvas and for each layer
        // Step 0, create a bbox table and tile table
        // Step 1, set up nashorn environment
        // Step 2, for each tuple in the query result
        // Step 3,     run data transforms to get transformed tuple
        // Step 4,     calculate bounding box
        // Step 5,     insert this tuple, its bbox and mappings
        // Step 6, create indexes (spatial index, index on tuple_id, and secondary indexes)
        long st = System.currentTimeMillis();
        for (Canvas c : project.getCanvases())
            for (int layer_id = 0; layer_id < c.getLayers().size(); layer_id ++) {

                Layer l = c.getLayers().get(layer_id);
                Transform trans = l.getTransform();

                // step 0: create tables for storing bboxes and tiles
                String bboxTableName = "bbox_" + projectName + "_" + c.getId() + "layer" + layer_id;
                String tileTableName = "tile_" + projectName + "_" + c.getId() + "layer" + layer_id;

                // drop table if exists
                String sql = "drop table if exists " + bboxTableName + ";";
                bboxStmt.executeUpdate(sql);
                sql = "drop table if exists " + tileTableName + ";";
                tileStmt.executeUpdate(sql);
                sql = "drop table if exists sorted_" + tileTableName + ";";
                tileStmt.executeUpdate(sql);

                // create the bbox table
                sql = "create table " + bboxTableName + " (";
                for (int i = 0; i < trans.getColumnNames().size(); i ++)
                    if (Config.database == Config.Database.MYSQL)
                        sql += trans.getColumnNames().get(i) + " mediumtext, ";
                    else if (Config.database == Config.Database.PSQL)
                        sql += trans.getColumnNames().get(i) + " text, ";

                if (Config.database == Config.Database.PSQL){
                    if (Config.indexingScheme == Config.IndexingScheme.TUPLE_MAPPING ||
                            Config.indexingScheme == Config.IndexingScheme.SORTED_TUPLE_MAPPING)
                        sql += "tuple_id int, ";
                    sql += "cx double precision, cy double precision, minx double precision, miny double precision, maxx double precision, maxy double precision, geom geometry(polygon)";
                }
                else if (Config.database == Config.Database.MYSQL) {
                    if (Config.indexingScheme == Config.IndexingScheme.TUPLE_MAPPING ||
                            Config.indexingScheme == Config.IndexingScheme.SORTED_TUPLE_MAPPING)
                        sql += "tuple_id int, ";
                    sql += "cx double precision, cy double precision, minx double precision, miny double precision, maxx double precision, maxy double precision, geom polygon not null";
                    if (Config.indexingScheme == Config.IndexingScheme.TUPLE_MAPPING ||
                            Config.indexingScheme == Config.IndexingScheme.SORTED_TUPLE_MAPPING)
                        sql += ", index (tuple_id)";
                    if (Config.indexingScheme == Config.IndexingScheme.SPATIAL_INDEX)
                        sql += ", spatial index (geom)";
                }
                sql += ");";
                bboxStmt.executeUpdate(sql);

                // create tile table
                if (Config.indexingScheme == Config.IndexingScheme.TUPLE_MAPPING ||
                        Config.indexingScheme == Config.IndexingScheme.SORTED_TUPLE_MAPPING) {
                    if (Config.database == Config.Database.PSQL)
                        sql = "create table " + tileTableName + " (tuple_id int, tile_id varchar(50));";
                    else if (Config.database == Config.Database.MYSQL)
                        sql = "create table " + tileTableName + " (tuple_id int, tile_id varchar(50), index (tile_id));";
                    tileStmt.executeUpdate(sql);
                }

                // if this is an empty layer, continue
                if (trans.getDb().equals(""))
                    continue;

                // step 1: set up nashorn environment, prepared statement, column name to id mapping
                NashornScriptEngine engine = null;
                if (! trans.getTransformFunc().equals(""))
                    engine = setupNashorn(trans.getTransformFunc());

                // step 2: looping through query results
                // TODO: distinguish between separable and non-separable cases
                ResultSet rs = DbConnector.getQueryResultIterator(trans.getDb(), trans.getQuery());
                int numColumn = rs.getMetaData().getColumnCount();
                int rowCount = 0, mappingCount = 0;
                StringBuilder bboxInsSqlBuilder = new StringBuilder("insert into " + bboxTableName + " values");
                StringBuilder tileInsSqlBuilder = new StringBuilder("insert into " + tileTableName + " values");
                while (rs.next()) {

                    // count log
                    rowCount ++;
                    if (rowCount % 1000000 == 0)
                        System.out.println(rowCount);

                    //get raw row
                    ArrayList<String> curRawRow = new ArrayList<>();
                    for (int i = 1; i <= numColumn; i ++)
                        curRawRow.add(rs.getString(i));

                    // step 3: run transform function on this tuple
                    ArrayList<String> transformedRow;
                    if (! trans.getTransformFunc().equals(""))
                        transformedRow = getTransformedRow(c, curRawRow, engine);
                    else
                        transformedRow = curRawRow;

                    // step 4: get bounding boxes coordinates
                    ArrayList<Double> curBbox = getBboxCoordinates(c, l, transformedRow);

                    // insert into bbox table
                    if (bboxInsSqlBuilder.charAt(bboxInsSqlBuilder.length() - 1) == ')')
                        bboxInsSqlBuilder.append(",(");
                    else
                        bboxInsSqlBuilder.append(" (");
                    for (int i = 0; i < transformedRow.size(); i ++)
                        if (Config.database == Config.Database.PSQL)
                            bboxInsSqlBuilder.append("'" + transformedRow.get(i).replaceAll("\'", "\'\'") + "', ");
                        else if (Config.database == Config.Database.MYSQL)
                            bboxInsSqlBuilder.append("'" + transformedRow.get(i).replaceAll("\'", "\\\\'") + "', ");

                    if (Config.indexingScheme !=  Config.IndexingScheme.SPATIAL_INDEX)
                        bboxInsSqlBuilder.append(String.valueOf(rowCount) + ", ");
                    for (int i = 0; i < 6; i ++)
                        bboxInsSqlBuilder.append(String.valueOf(curBbox.get(i)) + ", ");

                    double minx, miny, maxx, maxy;
                    minx = curBbox.get(2);
                    miny = curBbox.get(3);
                    maxx = curBbox.get(4);
                    maxy = curBbox.get(5);
                    bboxInsSqlBuilder.append("ST_GeomFromText('");
                    bboxInsSqlBuilder.append(getPolygonText(minx, miny, maxx, maxy));
                    bboxInsSqlBuilder.append("'))");

                    if (rowCount % Config.bboxBatchSize == 0) {
                        bboxInsSqlBuilder.append(";");
                        bboxStmt.executeUpdate(bboxInsSqlBuilder.toString());
                        DbConnector.commitConnection(Config.databaseName);
                        bboxInsSqlBuilder = new StringBuilder("insert into " + bboxTableName + " values");
                    }

                    // insert into tile table
                    if (! l.isStatic() && Config.indexingScheme == Config.IndexingScheme.TUPLE_MAPPING ||
                            Config.indexingScheme == Config.IndexingScheme.SORTED_TUPLE_MAPPING ) {
                        int xStart = (int) Math.max(0, Math.floor(minx / Config.tileW));
                        int yStart = (int) Math.max(0, Math.floor(miny/ Config.tileH));
                        int xEnd = (int) Math.floor(maxx / Config.tileW);
                        int yEnd = (int) Math.floor(maxy / Config.tileH);

                        for (int i = xStart; i <= xEnd; i ++)
                            for (int j = yStart; j <= yEnd; j ++) {
                                mappingCount ++;
                                String tileId = (i * Config.tileW) + "_" + (j * Config.tileH);
                                if (tileInsSqlBuilder.charAt(tileInsSqlBuilder.length() - 1) == ')')
                                    tileInsSqlBuilder.append(",(");
                                else
                                    tileInsSqlBuilder.append(" (");
                                tileInsSqlBuilder.append(rowCount + ", " + "'" + tileId + "')");
                                if (mappingCount % Config.tileBatchSize== 0) {
                                    tileInsSqlBuilder.append(";");
                                    tileStmt.executeUpdate(tileInsSqlBuilder.toString());
                                    DbConnector.commitConnection(Config.databaseName);
                                    tileInsSqlBuilder = new StringBuilder("insert into " + tileTableName + " values");
                                }
                            }
                    }
                }
                rs.close();
                DbConnector.closeConnection(trans.getDb());

                // insert tail stuff
                if (rowCount % Config.bboxBatchSize != 0) {
                    bboxInsSqlBuilder.append(";");
                    bboxStmt.executeUpdate(bboxInsSqlBuilder.toString());
                    DbConnector.commitConnection(Config.databaseName);
                }
                if (mappingCount % Config.tileBatchSize != 0) {
                    tileInsSqlBuilder.append(";");
                    tileStmt.executeUpdate(tileInsSqlBuilder.toString());
                    DbConnector.commitConnection(Config.databaseName);
                }

                long curTime = System.currentTimeMillis();
//                System.out.println("Insertion: " + (curTime - st) / 1000.0 + "s.");
                if (Config.database == Config.Database.PSQL) {
                    if (Config.indexingScheme == Config.IndexingScheme.TUPLE_MAPPING ||
                            Config.indexingScheme == Config.IndexingScheme.SORTED_TUPLE_MAPPING) {
                        sql = "create index tuple_idx_" + bboxTableName + " on " + bboxTableName + " (tuple_id);";
                        bboxStmt.executeUpdate(sql);
                        sql = "create index tile_idx_" + tileTableName + " on " + tileTableName + " (tile_id);";
                        tileStmt.executeUpdate(sql);
                    }
                    if (Config.indexingScheme == Config.IndexingScheme.SPATIAL_INDEX) {
                        sql = "create index sp_" + bboxTableName + " on " + bboxTableName + " using gist (geom);";
                        bboxStmt.executeUpdate(sql);
                        sql = "cluster " + bboxTableName + " using sp_" + bboxTableName + ";";
                        bboxStmt.executeUpdate(sql);
                    }
                    if (Config.indexingScheme == Config.IndexingScheme.TUPLE_MAPPING) {
                        sql = "cluster " + bboxTableName + " using tuple_idx_" + bboxTableName + ";";
                        tileStmt.executeUpdate(sql);
                        sql = "cluster " + tileTableName + " using tile_idx_" + tileTableName + ";";
                        tileStmt.executeUpdate(sql);
                    }
                    DbConnector.commitConnection(Config.databaseName);
                }
                else if (Config.database == Config.Database.MYSQL) {
                    if (Config.indexingScheme == Config.IndexingScheme.SORTED_TUPLE_MAPPING) {
                        sql = "create table sorted_" + tileTableName + " (tuple_id int, tile_id varchar(50));";
                        tileStmt.executeUpdate(sql);
                        sql = "insert into sorted_" + tileTableName + " select * from " + tileTableName + " order by tile_id;";
                        tileStmt.executeUpdate(sql);
                        sql = "alter table sorted_" + tileTableName + " add index(tile_id);";
                        tileStmt.executeUpdate(sql);
                        DbConnector.commitConnection(Config.databaseName);
                    }
                }
//                System.out.println("Indexing: " + (System.currentTimeMillis() - curTime) / 1000.0 + "s.");
//                System.out.println();
            }

        bboxStmt.close();
        tileStmt.close();
        System.out.println("Done precomputing!");
    }

    // set up nashorn enviroment
    protected NashornScriptEngine setupNashorn(String transformFunc) throws ScriptException {

        NashornScriptEngine engine = (NashornScriptEngine) new ScriptEngineManager()
                .getEngineByName("nashorn");
        FilesystemFolder rootFolder = FilesystemFolder.create(new File(Config.d3Dir), "UTF-8");
        Require.enable(engine, rootFolder);

        // register the data transform function with nashorn
        String script = "var d3 = require('d3');\n"; // TODO: let users specify all required d3 libraries.
        script += "var trans = " + transformFunc + ";\n";
        engine.eval(script);

        // get rendering parameters
        engine.put("renderingParams", project.getRenderingParams());

        return engine;
    }

    // run the transformed function on a row to get a transformed row
    protected ArrayList<String> getTransformedRow(Canvas c, ArrayList<String> row, NashornScriptEngine engine)
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
    protected ArrayList<Double> getBboxCoordinates(Canvas c, Layer l, ArrayList<String> row) {

        // array to return
        ArrayList<Double> bbox = new ArrayList<>();

        // construct a column name to column index mapping table
        Map<String, Integer> colName2Id = new HashMap<>();
        for (int i = 0; i < l.getTransform().getColumnNames().size(); i ++)
            colName2Id.put(l.getTransform().getColumnNames().get(i), i);

        // placement stuff
        Placement p = (l.isStatic() ? null : l.getPlacement());
        String centroid_x = (l.isStatic() ? null : p.getCentroid_x());
        String centroid_y = (l.isStatic() ? null : p.getCentroid_y());
        String width_func = (l.isStatic() ? null : p.getWidth());
        String height_func = (l.isStatic() ? null : p.getHeight());

        // calculate bounding box
        if (! l.isStatic()) {
            double centroid_x_dbl, centroid_y_dbl;
            double width_dbl, height_dbl;

            // centroid_x
            if (centroid_x.substring(0, 4).equals("full"))
                centroid_x_dbl = c.getW() / 2;
            else if (centroid_x.substring(0, 3).equals("con"))
                centroid_x_dbl = Double.parseDouble(centroid_x.substring(4));
            else {
                String curColName = centroid_x.substring(4);
                int curColId = colName2Id.get(curColName);
                centroid_x_dbl = Double.parseDouble(row.get(curColId));
            }

            // centroid_y
            if (centroid_y.substring(0, 4).equals("full"))
                centroid_y_dbl = c.getH() / 2;
            else if (centroid_y.substring(0, 3).equals("con"))
                centroid_y_dbl = Double.parseDouble(centroid_y.substring(4));
            else {
                String curColName = centroid_y.substring(4);
                int curColId = colName2Id.get(curColName);
                centroid_y_dbl = Double.parseDouble(row.get(curColId));
            }

            // width
            if (width_func.substring(0, 4).equals("full"))
                width_dbl = c.getW();
            else if (width_func.substring(0, 3).equals("con"))
                width_dbl = Double.parseDouble(width_func.substring(4));
            else {
                String curColName = width_func.substring(4);
                int curColId = colName2Id.get(curColName);
                width_dbl = Double.parseDouble(row.get(curColId));
            }

            // height
            if (height_func.substring(0, 4).equals("full"))
                height_dbl = c.getH();
            else if (height_func.substring(0, 3).equals("con"))
                height_dbl = Double.parseDouble(height_func.substring(4));
            else {
                String curColName = height_func.substring(4);
                int curColId = colName2Id.get(curColName);
                height_dbl = Double.parseDouble(row.get(curColId));
            }

            // get bounding box
            bbox.add(centroid_x_dbl);	// cx
            bbox.add(centroid_y_dbl);	// cy
            bbox.add(centroid_x_dbl - width_dbl / 2.0);	// min x
            bbox.add(centroid_y_dbl - height_dbl / 2.0);	// min y
            bbox.add(centroid_x_dbl + width_dbl / 2.0);	// max x
            bbox.add(centroid_y_dbl + height_dbl / 2.0);	// max y
        }
        else
            for (int i = 0; i < 6; i ++)
                bbox.add(0.0);

        return bbox;
    }

    protected String getPolygonText(double minx, double miny, double maxx, double maxy) {

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
