package box;

import java.util.ArrayList;
import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.io.WKTReader;
import org.locationtech.jts.io.WKTWriter;
import project.Canvas;
import project.Layer;
import project.View;

public abstract class BoxGetter {

    public ArrayList<ArrayList<ArrayList<String>>> fetchData(
            Canvas c, Box newBox, Box oldBox, ArrayList<String> predicates) throws Exception {

        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();

        // coordinates
        double newMinx = newBox.getMinx(), newMiny = newBox.getMiny();
        double newMaxx = newBox.getMaxx(), newMaxy = newBox.getMaxy();
        double oldMinx = oldBox.getMinx(), oldMiny = oldBox.getMiny();
        double oldMaxx = oldBox.getMaxx(), oldMaxy = oldBox.getMaxy();

        // calculate delta area
        GeometryFactory fact = new GeometryFactory();
        WKTReader wktRdr = new WKTReader(fact);
        String wktNew =
                "POLYGON(("
                        + newMinx
                        + " "
                        + newMiny
                        + ","
                        + newMinx
                        + " "
                        + newMaxy
                        + ","
                        + newMaxx
                        + " "
                        + newMaxy
                        + ","
                        + newMaxx
                        + " "
                        + newMiny
                        + ","
                        + newMinx
                        + " "
                        + newMiny
                        + "))";
        String wktOld =
                "POLYGON(("
                        + oldMinx
                        + " "
                        + oldMiny
                        + ","
                        + oldMinx
                        + " "
                        + oldMaxy
                        + ","
                        + oldMaxx
                        + " "
                        + oldMaxy
                        + ","
                        + oldMaxx
                        + " "
                        + oldMiny
                        + ","
                        + oldMinx
                        + " "
                        + oldMiny
                        + "))";
        Geometry newBoxGeom = wktRdr.read(wktNew);
        Geometry oldBoxGeom = wktRdr.read(wktOld);
        Geometry deltaGeom = newBoxGeom.difference(oldBoxGeom);
        WKTWriter wktWtr = new WKTWriter();
        String deltaWkt = wktWtr.write(deltaGeom);

        // loop through each layer
        for (int i = 0; i < c.getLayers().size(); i++) {
            Layer curLayer = c.getLayers().get(i);
            // if this layer is static, add an empty placeholder
            if (curLayer.isStatic()) data.add(new ArrayList<>());
            else
                data.add(
                        curLayer.getIndexer()
                                .getDataFromRegion(
                                        c, i, deltaWkt, predicates.get(i), newBox, oldBox));
        }
        return data;
    }

    public abstract BoxandData getBox(
            Canvas c, View v, double mx, double my, Box oldBox, ArrayList<String> predicates)
            throws Exception;
}
