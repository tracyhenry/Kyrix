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
            try {
                data = getTileFromDB(c, minx, miny, predicates, project);
            }catch (Exception e) {
                e.printStackTrace();
            }
            tileCache.put(key, data);
            return data;
        }
    }

    // get a tile from mysql
    private static ArrayList<ArrayList<ArrayList<String>>> getTileFromDB(Canvas c, int minx, int miny, ArrayList<String> predicates, Project project)
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
                    + c.getId() + "layer" + i + " where "
            //        + "minx <= " + (minx + Config.tileW) + " and "
            //        + "maxx >= " + minx + " and "
            //        + "miny <= " + (miny + Config.tileH) + " and "
            //        + "maxy >= " + miny;
                    + "MBRIntersects(GeomFromText('Polygon((" + minx + " " + miny + "," + (minx + Config.tileW) + " " + miny
                    + "," + (minx + Config.tileW) + " " + (miny + Config.tileH) + "," + minx + " " + (miny + Config.tileH)
                    + "," + minx + " " + miny;
            sql += "))'),geom)";
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

