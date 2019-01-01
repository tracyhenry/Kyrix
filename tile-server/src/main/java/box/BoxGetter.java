package box;

import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.io.WKTReader;
import org.locationtech.jts.io.WKTWriter;
import project.Canvas;
import project.Layer;

import java.util.ArrayList;

public abstract class BoxGetter {

    public ArrayList<ArrayList<ArrayList<String>>> fetchData(Canvas c, double minx, double miny, double maxx, double maxy, ArrayList<String> predicates, boolean hasBox)
            throws Exception {

        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();

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
            Layer curLayer = c.getLayers().get(i);
            // if this layer is static, add an empty placeholder
            if (curLayer.isStatic())
                data.add(new ArrayList<>());
            else
                data.add(curLayer.getIndexer().getDataFromRegion(c, i, deltaWkt, predicates.get(i)));
        }
        return data;
    }

    public abstract BoxandData getBox(Canvas c, double mx, double my, int viewportH, int viewportW, ArrayList<String> predicates, boolean hasBox)
            throws Exception;
}
