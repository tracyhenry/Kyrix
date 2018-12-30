package index;

import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.DbConnector;
import project.Canvas;
import project.Layer;
import project.Transform;

import javax.script.ScriptException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;

/**
 * Created by wenbo on 12/24/18.
 */
public class PsqlSpatialIndexer extends Indexer {

    private Connection dbConn;

    public PsqlSpatialIndexer()
        throws SQLException, ClassNotFoundException, ScriptException, NoSuchMethodException {

        super();
        dbConn = DbConnector.getDbConn(Config.dbServer, Config.databaseName, Config.userName, Config.password);
    }

    public void precompute() throws SQLException,
            ClassNotFoundException,
            ScriptException,
            NoSuchMethodException {

        System.out.println("Precomputing...");
        String projectName = project.getName();

        // create postgis extension if not existed
        String psql = "CREATE EXTENSION if not exists postgis;";
        bboxStmt.executeUpdate(psql);
        psql = "CREATE EXTENSION if not exists postgis_topology;";
        bboxStmt.executeUpdate(psql);

        long st = System.currentTimeMillis();
        for (Canvas c : project.getCanvases())
            for (int layer_id = 0; layer_id < c.getLayers().size(); layer_id ++) {

                Layer l = c.getLayers().get(layer_id);
                Transform trans = l.getTransform();

                // step 0: create tables for storing bboxes and tiles
                String bboxTableName = "bbox_" + projectName + "_" + c.getId() + "layer" + layer_id;

                // drop table if exists
                String sql = "drop table if exists " + bboxTableName + ";";
                bboxStmt.executeUpdate(sql);

                // create the bbox table
                sql = "create table " + bboxTableName + " (";
                for (int i = 0; i < trans.getColumnNames().size(); i ++)
                    sql += trans.getColumnNames().get(i) + " text, ";
                sql += "cx double precision, cy double precision, minx double precision, miny double precision, maxx double precision, maxy double precision, geom geometry(polygon));";
                bboxStmt.executeUpdate(sql);

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
                int rowCount = 0;
                String insertSql = "insert into " + bboxTableName + " values (";
                for (int i = 0; i < trans.getColumnNames().size() + 6; i ++)
                    insertSql += "?, ";
                insertSql += "ST_GeomFromText(?));";
                PreparedStatement preparedStmt = dbConn.prepareStatement(insertSql);
                while (rs.next()) {

                    // count log
                    rowCount ++;
                    if (rowCount % 1000000 == 0)
                        System.out.println(rowCount);

                    // get raw row
                    ArrayList<String> curRawRow = new ArrayList<>();
                    for (int i = 1; i <= numColumn; i ++)
                        curRawRow.add(rs.getString(i));

                    // step 3: run transform function on this tuple
                    ArrayList<String> transformedRow;
                    if (! trans.getTransformFunc().equals(""))
                        transformedRow = getTransformedRow(c, curRawRow, engine);
                    else
                        transformedRow = curRawRow;

                    // step 4: calculate bounding boxes
                    ArrayList<Double> curBbox = getBboxCoordinates(c, l, transformedRow);

                    // insert into bbox table
                    for (int i = 0; i < transformedRow.size(); i ++)
                        preparedStmt.setString(i + 1, transformedRow.get(i).replaceAll("\'", "\'\'"));
                    for (int i = 0; i < 6; i ++)
                        preparedStmt.setDouble(transformedRow.size() + i + 1, curBbox.get(i));

                    double minx, miny, maxx, maxy;
                    minx = curBbox.get(2);
                    miny = curBbox.get(3);
                    maxx = curBbox.get(4);
                    maxy = curBbox.get(5);
                    preparedStmt.setString(transformedRow.size() + 7,
                            getPolygonText(minx, miny, maxx, maxy));
                    preparedStmt.addBatch();

                    if (rowCount % Config.bboxBatchSize == 0) {
                        preparedStmt.executeBatch();
                        DbConnector.commitConnection(Config.databaseName);
                    }
                }
                rs.close();

                // insert tail stuff
                if (rowCount % Config.bboxBatchSize != 0) {
                    preparedStmt.executeBatch();
                    DbConnector.commitConnection(Config.databaseName);
                }

//                long curTime = System.currentTimeMillis();
//                System.out.println("Insertion: " + (curTime - st) / 1000.0 + "s.");

                // create index
                sql = "create index sp_" + bboxTableName + " on " + bboxTableName + " using gist (geom);";
                bboxStmt.executeUpdate(sql);
                sql = "cluster " + bboxTableName + " using sp_" + bboxTableName + ";";
                bboxStmt.executeUpdate(sql);
                DbConnector.commitConnection(Config.databaseName);

//                System.out.println("Indexing: " + (System.currentTimeMillis() - curTime) / 1000.0 + "s.");
//                System.out.println();
            }

        bboxStmt.close();
        System.out.println("Done precomputing!");
    }
}
