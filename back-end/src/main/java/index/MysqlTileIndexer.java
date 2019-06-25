package index;

import box.Box;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Layer;
import project.Transform;

/** Created by wenbo on 12/31/18. */
public class MysqlTileIndexer extends BoundingBoxIndexer {

    private static MysqlTileIndexer instance = null;

    // singleton pattern to ensure only one instance existed
    private MysqlTileIndexer() {}

    // thread-safe instance getter
    public static synchronized MysqlTileIndexer getInstance() {

        if (instance == null) instance = new MysqlTileIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        // TODO: switch to prepared statments
        Statement bboxStmt, tileStmt;
        bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);
        tileStmt = DbConnector.getStmtByDbName(Config.databaseName);

        // set up query iterator
        Layer l = c.getLayers().get(layerId);
        Transform trans = l.getTransform();
        Statement rawDBStmt =
                (trans.getDb().isEmpty() ? null : DbConnector.getStmtByDbName(trans.getDb()));
        ResultSet rs =
                (trans.getDb().isEmpty()
                        ? null
                        : DbConnector.getQueryResultIterator(rawDBStmt, trans.getQuery()));

        // step 0: create tables for storing bboxes and tiles
        String bboxTableName =
                "bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;
        String tileTableName =
                "tile_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;

        // drop table if exists
        String sql = "drop table if exists " + bboxTableName + ";";
        bboxStmt.executeUpdate(sql);
        sql = "drop table if exists " + tileTableName + ";";
        tileStmt.executeUpdate(sql);
        sql = "drop table if exists sorted_" + tileTableName + ";";
        tileStmt.executeUpdate(sql);

        // create the bbox table
        sql = "create table " + bboxTableName + " (";
        for (int i = 0; i < trans.getColumnNames().size(); i++)
            sql += trans.getColumnNames().get(i) + " mediumtext, ";

        sql +=
                "tuple_id int, cx double precision, cy double precision, minx double precision, "
                        + "miny double precision, maxx double precision, maxy double precision";
        sql += ", index (tuple_id));";
        bboxStmt.executeUpdate(sql);

        // create tile table
        sql =
                "create table "
                        + tileTableName
                        + " (tuple_id int, tile_id varchar(50), index (tile_id));";
        tileStmt.executeUpdate(sql);

        // if this is an empty layer, return
        if (trans.getDb().isEmpty()) return;

        // step 1: set up nashorn environment, prepared statement, column name to id mapping
        NashornScriptEngine engine = null;
        if (!trans.getTransformFunc().isEmpty()) engine = setupNashorn(trans.getTransformFunc());

        // step 2: looping through query results
        // TODO: distinguish between separable and non-separable cases
        StringBuilder bboxInsSqlBuilder =
                new StringBuilder("insert into " + bboxTableName + " values");
        StringBuilder tileInsSqlBuilder =
                new StringBuilder("insert into " + tileTableName + " values");

        int rowCount = 0, mappingCount = 0;
        int numColumn = rs.getMetaData().getColumnCount();
        while (rs.next()) {

            // count log
            rowCount++;
            if (rowCount % 1000000 == 0) System.out.println(rowCount);

            // get raw row
            ArrayList<String> curRawRow = new ArrayList<>();
            for (int i = 1; i <= numColumn; i++) curRawRow.add(rs.getString(i));

            // step 3: run transform function on this tuple
            ArrayList<String> transformedRow;
            if (!trans.getTransformFunc().isEmpty())
                transformedRow = getTransformedRow(c, curRawRow, engine);
            else transformedRow = curRawRow;

            // step 4: get bounding boxes coordinates
            ArrayList<Double> curBbox = Indexer.getBboxCoordinates(l, transformedRow);

            // insert into bbox table
            if (bboxInsSqlBuilder.charAt(bboxInsSqlBuilder.length() - 1) == ')')
                bboxInsSqlBuilder.append(",(");
            else bboxInsSqlBuilder.append(" (");
            for (int i = 0; i < transformedRow.size(); i++)
                bboxInsSqlBuilder.append(
                        "'" + transformedRow.get(i).replaceAll("\'", "\\\\'") + "', ");
            bboxInsSqlBuilder.append(String.valueOf(rowCount));
            for (int i = 0; i < 6; i++)
                bboxInsSqlBuilder.append(", " + String.valueOf(curBbox.get(i)));
            bboxInsSqlBuilder.append(")");
            if (rowCount % Config.bboxBatchSize == 0) {
                bboxInsSqlBuilder.append(";");
                bboxStmt.executeUpdate(bboxInsSqlBuilder.toString());
                bboxInsSqlBuilder = new StringBuilder("insert into " + bboxTableName + " values");
            }

            // insert into tile table
            double minx, miny, maxx, maxy;
            minx = curBbox.get(2);
            miny = curBbox.get(3);
            maxx = curBbox.get(4);
            maxy = curBbox.get(5);
            if (!l.isStatic()) {
                int xStart = (int) Math.max(0, Math.floor(minx / Config.tileW));
                int yStart = (int) Math.max(0, Math.floor(miny / Config.tileH));
                int xEnd = (int) Math.floor(maxx / Config.tileW);
                int yEnd = (int) Math.floor(maxy / Config.tileH);

                for (int i = xStart; i <= xEnd; i++)
                    for (int j = yStart; j <= yEnd; j++) {
                        mappingCount++;
                        String tileId = (i * Config.tileW) + "_" + (j * Config.tileH);
                        if (tileInsSqlBuilder.charAt(tileInsSqlBuilder.length() - 1) == ')')
                            tileInsSqlBuilder.append(",(");
                        else tileInsSqlBuilder.append(" (");
                        tileInsSqlBuilder.append(rowCount + ", " + "'" + tileId + "')");
                        if (mappingCount % Config.tileBatchSize == 0) {
                            tileInsSqlBuilder.append(";");
                            tileStmt.executeUpdate(tileInsSqlBuilder.toString());
                            tileInsSqlBuilder =
                                    new StringBuilder("insert into " + tileTableName + " values");
                        }
                    }
            }
        }
        rs.close();
        rawDBStmt.close();
        DbConnector.closeConnection(trans.getDb());

        // insert tail stuff
        if (rowCount % Config.bboxBatchSize != 0) {
            bboxInsSqlBuilder.append(";");
            bboxStmt.executeUpdate(bboxInsSqlBuilder.toString());
        }
        if (mappingCount % Config.tileBatchSize != 0) {
            tileInsSqlBuilder.append(";");
            tileStmt.executeUpdate(tileInsSqlBuilder.toString());
        }

        // sorted cluster
        sql = "create table sorted_" + tileTableName + " (tuple_id int, tile_id varchar(50));";
        tileStmt.executeUpdate(sql);
        sql =
                "insert into sorted_"
                        + tileTableName
                        + " select * from "
                        + tileTableName
                        + " order by tile_id;";
        tileStmt.executeUpdate(sql);
        sql = "alter table sorted_" + tileTableName + " add index(tile_id);";
        tileStmt.executeUpdate(sql);

        // close db connections
        bboxStmt.close();
        tileStmt.close();
        DbConnector.closeConnection(Config.databaseName);
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromRegion(
            Canvas c, int layerId, String regionWKT, String predicate, Box newBox, Box oldBox)
            throws Exception {
        throw new Exception("Spatial data fetching is not available with tile indexes.");
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromTile(
            Canvas c, int layerId, int minx, int miny, String predicate) throws Exception {

        // get column list string
        String colListStr = c.getLayers().get(layerId).getColStr("bbox");

        // construct range query
        String sql =
                "select "
                        + colListStr
                        + " from bbox_"
                        + Main.getProject().getName()
                        + "_"
                        + c.getId()
                        + "layer"
                        + layerId
                        + " bbox left join sorted_tile_"
                        + Main.getProject().getName()
                        + "_"
                        + c.getId()
                        + "layer"
                        + layerId
                        + " tile on bbox.tuple_id = tile.tuple_id";
        sql += " where tile.tile_id = " + "'" + minx + "_" + miny + "'";
        if (predicate.length() > 0) sql += " and " + predicate + ";";
        System.out.println(minx + " " + miny + " : " + sql);

        return DbConnector.getQueryResult(Config.databaseName, sql);
    }
}
