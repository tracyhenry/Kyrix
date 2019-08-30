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

    public final Box DUMMY_OLD_BOX = new Box(-1e5, -1e5, -1e5, -1e5);

    public ArrayList<ArrayList<ArrayList<String>>> fetchData(
            Canvas c, Box newBox, Box oldBox, ArrayList<String> predicates) throws Exception {

        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();

        // WKT stuff for all layers
        GeometryFactory fact = new GeometryFactory();
        WKTReader wktRdr = new WKTReader(fact);
        WKTWriter wktWtr = new WKTWriter();
        String wktNew = newBox.getWKT();
        Geometry newBoxGeom = wktRdr.read(wktNew);

        // loop through each layer
        for (int i = 0; i < c.getLayers().size(); i++) {
            Layer curLayer = c.getLayers().get(i);
            // if this layer is static, add an empty placeholder
            if (curLayer.isStatic() || !curLayer.getFetchingScheme().equals("dbox")) {
                data.add(new ArrayList<>());
                continue;
            }
            // calculate delta area
            Box curOldBox;
            if (curLayer.isDeltaBox()) curOldBox = oldBox;
            else curOldBox = DUMMY_OLD_BOX;
            String wktOld = curOldBox.getWKT();
            Geometry oldBoxGeom = wktRdr.read(wktOld);
            Geometry deltaGeom = newBoxGeom.difference(oldBoxGeom);
            String deltaWkt = wktWtr.write(deltaGeom);
            data.add(
                    curLayer.getIndexer()
                            .getDataFromRegion(
                                    c, i, deltaWkt, predicates.get(i), newBox, curOldBox));
        }
        return data;
    }

    public abstract BoxandData getBox(
            Canvas c, View v, double mx, double my, Box oldBox, ArrayList<String> predicates)
            throws Exception;
}
