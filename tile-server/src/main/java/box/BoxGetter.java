package box;

import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Project;

import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;

public abstract class BoxGetter {

    private Project project;
    public BoxGetter() {
        project = Main.getProject();
    }

    public ArrayList<ArrayList<ArrayList<String>>> fetchData(Canvas c, int minx, int miny, int maxx, int maxy, ArrayList<String> predicates)
            throws SQLException, ClassNotFoundException {
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();
        Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);
        try {
            // loop through each layer
            for (int i = 0; i < c.getLayers().size(); i++) {

                if (c.getLayers().get(i).isStatic()) {
                    data.add(new ArrayList<>());
                    continue;
                }
                // construct range query
                String sql = "select * from bbox_" + project.getName() + "_"
                        + c.getId() + "layer" + i + " where ";
                sql += (Config.database == Config.Database.MYSQL ? "MBRIntersects(GeomFromText" :
                        "st_Intersects(st_GeomFromText") +
                        "('Polygon(("
                        + minx + " " + miny + "," + maxx + " " + miny
                        + "," + maxx + " " + maxy + "," + minx + " " + maxy
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
        } catch (Exception e) {
            e.printStackTrace();
        }
        return data;
    }

    public abstract BoxandData getBox(Canvas c, int cx, int cy, int viewportH, int viewportW, ArrayList<String> predicates) throws SQLException, ClassNotFoundException;
}