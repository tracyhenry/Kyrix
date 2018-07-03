package box;

import box.Box;
import box.BoxGetter;
import box.BoxandData;
import box.History;
import main.Config;
import main.DbConnector;
import project.Canvas;
import project.Project;

import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;

public class MikeBoxGetter implements BoxGetter {
    double wrapLength = 0.5;
    //scale is the modification ratio for getLastBox()
    double scale = 0.4;

    //get box with fixed size which is two times larger than the viewport
    public BoxandData getBox(Canvas c, int cx, int cy, int viewportH, int viewportW, ArrayList<String> predicates, Project project)
                throws SQLException, ClassNotFoundException {
            ArrayList<ArrayList<ArrayList<String>>> data = null;
            // get db connector
            Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);
            double minx = cx - (0.5 + wrapLength) * viewportW;
            double miny = cy - (0.5 + wrapLength) * viewportH;
            double maxx = cx + (0.5 + wrapLength) * viewportW;
            double maxy = cy + (0.5 + wrapLength) * viewportH;
            try {
                // loop through each layer
                for (int i = 0; i < c.getLayers().size(); i++) {

                    if (c.getLayers().get(i).isStatic()) {
                        data.add(new ArrayList<ArrayList<String>>());
                        continue;
                    }
                    // construct range query
                    String sql = "select * from bbox_" + project.getName() + "_"
                            + c.getId() + "layer" + i + " where "
                            + "MBRIntersects(GeomFromText('Polygon((" + minx + " " + miny + "," + maxx + " " + miny
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
            Box box = new Box(minx, miny, maxx, maxy);
        return new BoxandData(box, data);
    }

    //get the box size according to the last box size and record the current tuple number
    public BoxandData getLastBox(Canvas c, int cx, int cy, int viewportH, int viewportW, ArrayList<String> predicates, Project project)
            throws SQLException, ClassNotFoundException {
        ArrayList<ArrayList<ArrayList<String>>> data = null;
        // get db connector
        Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);
        int count = 0;
        double minx, miny, maxx, maxy;
        if (History.getCanvas() != c) {
            minx = cx - (0.5 + wrapLength) * viewportW;
            miny = cy - (0.5 + wrapLength) * viewportH;
            maxx = cx + (0.5 + wrapLength) * viewportW;
            maxy = cy + (0.5 + wrapLength) * viewportH;
            History.resetHistory(c);
        }
        else{
            minx = History.box.getMinx();
            miny = History.box.getMiny();
            maxx = History.box.getMaxx();
            maxy = History.box.getMaxy();
        }
        try {
            // loop through each layer
            for (int i = 0; i < c.getLayers().size(); i++) {

                if (c.getLayers().get(i).isStatic()) {
                    data.add(new ArrayList<ArrayList<String>>());
                    continue;
                }
                // construct range query
                String sql = "select * from bbox_" + project.getName() + "_"
                        + c.getId() + "layer" + i + " where "
                        + "MBRIntersects(GeomFromText('Polygon((" + minx + " " + miny + "," + maxx + " " + miny
                        + "," + maxx + " " + maxy + "," + minx + " " + maxy
                        + "," + minx + " " + miny;
                sql += "))'),geom)";
                if (predicates.get(i).length() > 0)
                    sql += " and " + predicates.get(i);
                sql += ";";

                System.out.println(minx + " " + miny + " : " + sql);

                // add to response
                data.add(DbConnector.getQueryResult(stmt, sql));
                count += data.size();
            }
            stmt.close();
        } catch (Exception e) {
            e.printStackTrace();
        }

        double deltax = maxx - minx;
        double deltay = maxy - miny;
        if (count > 100000) {
            minx += deltax * scale / 2;
            maxx -= deltax * scale / 2;
            miny += deltay * scale / 2;
            maxy -= deltay * scale / 2;
        }
        else if (count < 1000){
            minx -= deltax * scale / 2;
            maxx += deltax * scale / 2;
            miny -= deltay * scale / 2;
            maxy += deltay * scale / 2;
        }

        History.updateHistory(count, new Box(minx, miny, maxx, maxy), c);

        Box box = new Box(minx, miny, maxx, maxy);
        return new BoxandData(box, data);
    }

    public BoxandData getRectBox(Canvas c, int cx, int cy, int viewportH, int viewportW, ArrayList<String> predicates, Project project) throws SQLException, ClassNotFoundException {
        //enlarge scale
        scale = 0.5;
        ArrayList<ArrayList<ArrayList<String>>> data = null;
        // get db connector
        Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);
        int count = 0;
        double minx = cx - (0.5 + wrapLength) * viewportW;
        double miny = cy - (0.5 + wrapLength) * viewportH;
        double maxx = cx + (0.5 + wrapLength) * viewportW;
        double maxy = cy + (0.5 + wrapLength) * viewportH;
        double deltaRight = 0;
        double deltaLeft = 0;
        double deltaUp = 0;
        double deltaDown = 0;
        while (true) {
            try {
                // loop through each layer
                for (int i = 0; i < c.getLayers().size(); i++) {

                    if (c.getLayers().get(i).isStatic()) {
                        data.add(new ArrayList<ArrayList<String>>());
                        continue;
                    }
                    // construct range query
                    String sql = "select * from bbox_" + project.getName() + "_"
                            + c.getId() + "layer" + i + " where "
                            + "MBRIntersects(GeomFromText('Polygon((" + (minx - deltaLeft) + " " + (miny - deltaUp) + ","
                            + (maxx + deltaRight) + " " + (miny - deltaUp) + "," + (maxx + deltaRight) + " "
                            + (maxy + deltaDown) + "," + (minx - deltaLeft) + " " + (maxy +deltaDown) + ","
                            + (minx -deltaLeft) + " " + (miny - deltaUp);
                    sql += "))'),geom)";
                    if (predicates.get(i).length() > 0)
                        sql += " and " + predicates.get(i);
                    sql += ";";

                    System.out.println(minx + " " + miny + " : " + sql);

                    // add to response
                    data.add(DbConnector.getQueryResult(stmt, sql));
                    count += data.size();
                }
                stmt.close();
            } catch (Exception e) {
                e.printStackTrace();
            }

            if (count >= 200000) {
                Box box = new Box(minx, miny, maxx, maxy);
                return new BoxandData(box, data);
            } else {
                deltaRight
            }
        }
    }
}
