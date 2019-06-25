package index;

import main.Main;
import project.Canvas;
import project.Layer;

public abstract class BoundingBoxIndexer extends Indexer {

    @Override
    public String getStaticDataQuery(Canvas c, int layerId, String predicate) {

        Layer l = c.getLayers().get(layerId);
        // get column list string
        String colListStr = l.getColStr("");

        // construct static query
        String sql =
                "select "
                        + colListStr
                        + " from bbox_"
                        + Main.getProject().getName()
                        + "_"
                        + c.getId()
                        + "layer"
                        + layerId;
        if (predicate.length() > 0) sql += " where " + predicate;
        sql += ";";

        return sql;
    }
}
