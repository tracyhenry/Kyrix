package box;

import main.Config;
import main.DbConnector;
import main.Main;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKTReader;
import org.locationtech.jts.io.WKTWriter;
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

    public ArrayList<ArrayList<ArrayList<String>>> fetchData(Canvas c, double minx, double miny, double maxx, double maxy, ArrayList<String> predicates, boolean hasBox)
            throws SQLException, ClassNotFoundException, ParseException {

        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();
        Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);

        // get the last box
        double oldMinx, oldMiny, oldMaxx, oldMaxy;
        if (! hasBox) {
            oldMinx = oldMaxx = oldMiny = oldMaxy = Double.MIN_VALUE;
            History.reset();
        } else {
            Box curBox = History.getBox();
            oldMinx = curBox.getMinx();
            oldMiny = curBox.getMiny();
            oldMaxx = curBox.getMaxx();
            oldMaxy = curBox.getMaxy();
        }
        History.updateHistory(c, new Box(minx, miny, maxx, maxy), predicates, 0);

        // calculate delta area
        GeometryFactory fact = new GeometryFactory();
        WKTReader wktRdr = new WKTReader(fact);
        String wktNew = "POLYGON((" + minx + " " + miny + "," +minx + " " + maxy + ","
                + maxx + " " + maxy + "," + maxx + " " + miny + "," + minx + " " + miny + "))";
        String wktOld = "POLYGON((" + oldMinx + " " + oldMiny + "," +oldMinx + " " + oldMaxy + ","
                + oldMaxx + " " + oldMaxy + "," + oldMaxx + " " + oldMiny + "," + oldMinx + " " + oldMiny + "))";
        Geometry newBoxGeom = wktRdr.read(wktNew);
        Geometry oldBoxGeom = wktRdr.read(wktOld);
        Geometry deltaGeom = newBoxGeom.difference(oldBoxGeom);
        WKTWriter wktWtr = new WKTWriter();
        String deltaWkt = wktWtr.write(deltaGeom);

        // loop through each layer
        for (int i = 0; i < c.getLayers().size(); i ++) {

            // if this layer is static, add an empty placeholder
            if (c.getLayers().get(i).isStatic()) {
                data.add(new ArrayList<>());
                continue;
            }

            // get column list string
            String colListStr = c.getLayers().get(i).getTransform().getColStr("");

            // construct range query
            String sql = "select " + colListStr + " from bbox_" + project.getName() + "_"
                    + c.getId() + "layer" + i + " where ";
            sql += (Config.database == Config.Database.MYSQL ? "MBRIntersects(GeomFromText" :
                    "st_Intersects(st_GeomFromText");
            sql += "('" + deltaWkt + "'),geom)";
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

    public abstract BoxandData getBox(Canvas c, double mx, double my, int viewportH, int viewportW, ArrayList<String> predicates, boolean hasBox)
            throws SQLException, ClassNotFoundException, ParseException;
}
