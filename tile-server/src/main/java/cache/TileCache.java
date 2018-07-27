package cache;


import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Map;

import main.DbConnector;
import project.Canvas;
import project.Project;
import main.Config;
import java.util.LinkedHashMap;

public class TileCache {
    private static LinkedHashMap tileCache;

    public static void create() {
        tileCache = new LinkedHashMap<String, ArrayList<ArrayList<ArrayList<String>>>>(Config.cacheSize + 1, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, ArrayList<ArrayList<ArrayList<String>>>> eldest) {
                return size() > Config.cacheSize;
            }
        };
    }

    public static ArrayList<ArrayList<ArrayList<String>>> getTile(Canvas c, int minx, int miny, ArrayList<String> predicates, Project project) {
        String key = c + "-" + minx + "-" + miny + "-" + predicates;
        ArrayList<ArrayList<ArrayList<String>>> data = null;
        if (tileCache.containsKey(key)) {
            System.out.println("cache hit!");
            return (ArrayList<ArrayList<ArrayList<String>>>) tileCache.get(key);
        } else {
            System.out.println("cache miss!");
            //check fetching scheme for the missed tile
            if (Config.indexingScheme == Config.IndexingScheme.TUPLE_MAPPING) {
                try {
                    data = getTileFromTupleMapping(c, minx, miny, predicates, project);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            else if (Config.indexingScheme == Config.IndexingScheme.SPATIAL_INDEX) {
                try {
                    data = getTileFromSpatialIndex(c, minx, miny, predicates, project);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            else if (Config.indexingScheme == Config.IndexingScheme.SORTED_TUPLE_MAPPING){
                try {
                    data = getTileFromSortedTupleMapping(c, minx, miny, predicates, project);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            tileCache.put(key, data);
            return data;
        }
    }

    // get a tile from mysql using tuple-tile mapping
    private static ArrayList<ArrayList<ArrayList<String>>> getTileFromSortedTupleMapping(Canvas c, int minx, int miny, ArrayList<String> predicates, Project project)
            throws SQLException, ClassNotFoundException {

        // container for data
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();

        // get db connector
        Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);

        // loop through each layer
        for (int i = 0; i < c.getLayers().size(); i ++) {

            if (c.getLayers().get(i).isStatic()) {
                data.add(new ArrayList<ArrayList<String>>());
                continue;
            }
            // construct range query
            String sql = "select bbox.* from bbox_" + project.getName() + "_"
                    + c.getId() + "layer" + i + " bbox left join sorted_tile_"  + project.getName() + "_"
                    + c.getId() + "layer" + i + " tile on bbox.tuple_id = tile.tuple_id";
            sql += " where tile.tile_id = " + "'" + minx + "_" + miny + "'";

            if (predicates.get(i).length() > 0)
                sql += " and " + predicates.get(i);
            sql += ";";

            System.out.println(minx + " " + miny + " : " + sql);

            // add to response
            data.add(DbConnector.getQueryResult(stmt, sql));
        }

        stmt.close();
        return data;
    }

    private static ArrayList<ArrayList<ArrayList<String>>> getTileFromTupleMapping(Canvas c, int minx, int miny, ArrayList<String> predicates, Project project)
            throws SQLException, ClassNotFoundException {

        // container for data
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();

        // get db connector
        Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);

        // loop through each layer
        for (int i = 0; i < c.getLayers().size(); i ++) {

            if (c.getLayers().get(i).isStatic()) {
                data.add(new ArrayList<ArrayList<String>>());
                continue;
            }

            // construct range query
            String sql = "select bbox.* from bbox_" + project.getName() + "_"
                    + c.getId() + "layer" + i + " bbox left join tile_"  + project.getName() + "_"
                    + c.getId() + "layer" + i + " tile on bbox.tuple_id = tile.tuple_id";
            sql += " where tile.tile_id = " + "'" + minx + "_" + miny + "'";

            if (predicates.get(i).length() > 0)
                sql += " and " + predicates.get(i);
            sql += ";";

            System.out.println(minx + " " + miny + " : " + sql);

            // add to response
            data.add(DbConnector.getQueryResult(stmt, sql));
        }

        stmt.close();
        return data;
    }
    //get a tile from disk using spatial index
    private static ArrayList<ArrayList<ArrayList<String>>> getTileFromSpatialIndex(Canvas c, int minx, int miny, ArrayList<String> predicates, Project project)
            throws SQLException, ClassNotFoundException {

        // container for data
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();

        // get db connector
        Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);

        // loop through each layer
        for (int i = 0; i < c.getLayers().size(); i ++) {

            if (c.getLayers().get(i).isStatic()) {
                data.add(new ArrayList<ArrayList<String>>());
                continue;
            }
            // construct range query

            String sql = "select * from bbox_" + project.getName() + "_"
                    + c.getId() + "layer" + i + " where ";
                if (Config.database == Config.Database.PSQL) {
                    sql += "st_intersects(st_GeomFromText('Polygon((" + minx + " " + miny + "," + (minx + Config.tileW) + " " + miny;
                }
                else if (Config.database == Config.Database.MYSQL) {
                    sql += "MBRIntersects(st_GeomFromText('Polygon((" + minx + " " + miny + "," + (minx + Config.tileW) + " " + miny;
                }
                sql += "," + (minx + Config.tileW) + " " + (miny + Config.tileH) + "," + minx + " " + (miny + Config.tileH)
                    + "," + minx + " " + miny + "))'),geom)";

            if (predicates.get(i).length() > 0)
                sql += " and " + predicates.get(i);
            sql += ";";

            System.out.println(minx + " " + miny + " : " + sql);

            // add to response
            data.add(DbConnector.getQueryResult(stmt, sql));
        }

        stmt.close();
        return data;
    }
}
