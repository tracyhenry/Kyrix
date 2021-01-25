package index;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.ArrayList;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Layer;
import project.StaticAggregation;
import project.Transform;

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
    public void createMV(Canvas c, int layerId) throws Exception {
        // get staticAggregation Ids
        Layer l = c.getLayers().get(layerId);
        String saId = l.getStaticAggregationId();
        int saIndex = Integer.valueOf(saId.substring(0, saId.indexOf("_")));
        StaticAggregation sa = Main.getProject().getStaticAggregations().get(saIndex);

        // only pre-materialize stuff for word clouds
        if (!sa.getType().equals("wordCloud")) return;

        // create new table in the kyrix db
        Transform trans = l.getTransform();
        Statement bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);

        // create temporary table to store query results
        String sql = "DROP TABLE IF EXISTS wordCloudTemp;";
        System.out.println(sql);
        bboxStmt.executeUpdate(sql);

        sql = "CREATE TABLE wordCloudTemp (";
        for (int i = 0; i < trans.getColumnNames().size(); i++)
            sql += (i == 0 ? "" : ", ") + trans.getColumnNames().get(i) + " text";
        sql += ")";
        System.out.println(sql);
        bboxStmt.executeUpdate(sql);

        // prepare for writing into kyrix db
        int rowCount = 0;
        String insertSql = "INSERT INTO wordCloudTemp VALUES (";
        for (int i = 0; i < trans.getColumnNames().size(); i++)
            insertSql += (i > 0 ? ", " : "") + "?";
        insertSql += ")";
        PreparedStatement preparedStmt =
                DbConnector.getPreparedStatement(Config.databaseName, insertSql);
        int numColumn = trans.getColumnNames().size();

        // get SQL GROUP BY query results
        ArrayList<ArrayList<String>> aggResults =
                DbConnector.getQueryResult(trans.getDb(), trans.getQuery());

        // iterate over the results
        for (int i = 0; i < aggResults.size(); i++) {

            // count log - important to increment early so modulo-zero doesn't
            // trigger on first iteration
            rowCount++;

            // get raw row
            ArrayList<String> curRawRow = aggResults.get(i);
            for (int j = 1; j <= numColumn; j++) {
                if (curRawRow.get(j - 1) == null) curRawRow.set(j - 1, "");
                preparedStmt.setString(j, curRawRow.get(j - 1).replaceAll("\'", "\'\'"));
            }
            preparedStmt.addBatch();
        }
        preparedStmt.executeBatch();
        preparedStmt.close();

        // close reader connection
        DbConnector.closeConnection(trans.getDb());

        //  create PLV8 function
        sql =
                "CREATE OR REPLACE FUNCTION getWordCloudCoordinates("
                        + "data jsonb[], renderingParams jsonb, rpKey text, canvasW int, canvasH int) returns setof jsonb AS $$ "
                        + sa.getGetWordCloudCoordinatesBody()
                        + "$$ LANGUAGE plv8 STABLE;";
        System.out.println("Creating getWordCloudCoordinates:\n" + sql);
        bboxStmt.executeUpdate(sql);

        // construct a big SQL to create a new table
        String indexTablaName =
                "bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;
        sql = "SELECT ";
        for (int i = 0; i < trans.getColumnNames().size(); i++) {
            String col = trans.getColumnNames().get(i);
            sql += "(v->>'" + col + "')::text AS " + col + ", ";
        }
        sql +=
                "(v->>'kyrixWCText')::text as kyrixWCText, (v->>'kyrixWCSize')::int as kyrixWCSize, "
                        + "(v->>'kyrixWCRotate')::float as kyrixWCRotate, (v->>'kyrixWCX')::float as kyrixWCX, (v->>'kyrixWCY')::float as kyrixWCY"
                        + " INTO "
                        + indexTablaName
                        + " FROM (SELECT getWordCloudCoordinates(array_agg(to_jsonb(wordCloudTemp)), "
                        + "'"
                        + Main.getProject().getRenderingParams()
                        + "'::jsonb, "
                        + "'staticAggregation_"
                        + saIndex
                        + "', "
                        + c.getW()
                        + ", "
                        + c.getH()
                        + ") FROM wordCloudTemp) v;";
        System.out.println("Construct index table sql:\n" + sql);
        bboxStmt.executeUpdate(sql);
        bboxStmt.close();
    }

    @Override
    public String getStaticDataQuery(Canvas c, int layerId, String predicate) throws Exception {
        return "SELECT * FROM bbox_"
                + Main.getProject().getName()
                + "_"
                + c.getId()
                + "layer"
                + layerId
                + " WHERE "
                + predicate
                + ";";
    }
}
