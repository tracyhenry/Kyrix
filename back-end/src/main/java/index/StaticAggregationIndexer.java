package index;

import box.Box;
import java.util.ArrayList;
import project.Canvas;
import project.Layer;

/**
 * Created by wenbo on 11/23/20. This is an indexer exclusively for aggregation-based non-zooming
 * kyrix templates. Examples include pie, treemap, bar charts. These templates (see
 * compiler/src/template-api/) all produce one canvas with three layers. The 1st layer is associated
 * with a SQL aggregation query, which are the things visible (e.g. pie). The 2nd layer is a dummy
 * sample layer which only holds sample non-aggregated data. Most commonly this wouldn't be useful,
 * but is used in the KyrixJ project to show non-aggregated data alongside the aggregate chart. The
 * 3rd layer is the legend layer.
 */
public class StaticAggregationIndexer extends Indexer {

    private static StaticAggregationIndexer instance = null;

    // singleton pattern to ensure only one instance existed
    protected StaticAggregationIndexer() {}

    // thread-safe instance getter
    public static synchronized StaticAggregationIndexer getInstance() {

        if (instance == null) instance = new StaticAggregationIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {}

    @Override
    public ArrayList<ArrayList<String>> getDataFromRegion(
            Canvas c, int layerId, String regionWKT, String predicate, Box newBox, Box oldBox)
            throws Exception {
        return null;
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromTile(
            Canvas c, int layerId, int minx, int miny, String predicate) throws Exception {
        return null;
    }

    @Override
    public String getStaticDataQuery(Canvas c, int layerId, String predicate) throws Exception {

        Layer l = c.getLayers().get(layerId);
        String q = l.getTransform().getQuery();
        String sql = "SELECT 1;";
        switch (layerId) {
            case 0:
                // aggregation layer
                // WHERE must occur before GROUP BY
                // so we need to do insert WHERE into the middle
                // of the original group by query
                int groupByPos = q.indexOf("GROUP BY");
                sql = q.substring(0, groupByPos);
                if (predicate.length() > 0) sql += "WHERE " + predicate + " ";
                sql += q.substring(groupByPos);
                sql += ";";
                break;
            case 1:
                // sample layer
                sql = q;
                if (predicate.length() > 0) sql += " WHERE " + predicate;
                sql += " LIMIT 150;";
                break;
        }
        return sql;
    }
}
