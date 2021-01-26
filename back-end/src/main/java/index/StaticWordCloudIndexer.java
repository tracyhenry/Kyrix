package index;

import main.Main;
import project.Canvas;

/** Created by wenbo on 1/24/21. */
public class StaticWordCloudIndexer extends StaticAggregationIndexer {
    private static StaticWordCloudIndexer instance = null;

    // singleton pattern to ensure only one instance existed
    protected StaticWordCloudIndexer() {}

    // thread-safe instance getter
    public static synchronized StaticAggregationIndexer getInstance() {

        if (instance == null) instance = new StaticWordCloudIndexer();
        return instance;
    }

    @Override
    public String getStaticDataQuery(Canvas c, int layerId, String predicate) throws Exception {
        String sql =
                "SELECT * FROM bbox_"
                        + Main.getProject().getName()
                        + "_"
                        + c.getId()
                        + "layer"
                        + layerId;
        if (predicate.length() > 0) sql += " WHERE " + predicate;
        sql += ";";
        return sql;
    }
}
