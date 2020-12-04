package server;

import box.BoxandData;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import index.Indexer;
import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import javax.net.ssl.HttpsURLConnection;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Layer;

/** Created by wenbo on 1/8/18. */
public class CanvasRequestHandler implements HttpHandler {

    private final Gson gson;

    public CanvasRequestHandler() {

        gson = new GsonBuilder().create();
    }

    @Override
    public void handle(HttpExchange httpExchange) throws IOException {

        System.out.println("Serving /canvas");

        try {
            // check if this is a POST request
            if (!httpExchange.getRequestMethod().equalsIgnoreCase("GET")) {
                Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_METHOD, "");
                return;
            }

            // get data of the current request
            String query = httpExchange.getRequestURI().getRawQuery();
            Map<String, String> queryMap = Server.queryToMap(query);
            String canvasId = queryMap.get("id");

            // get the current canvas
            Canvas c = null;
            c = Main.getProject().getCanvas(canvasId).deepCopy();

            // list of predicates
            ArrayList<String> predicates = new ArrayList<>();
            for (int i = 0; i < c.getLayers().size(); i++)
                predicates.add(queryMap.get("predicate" + i));

            // check predicates
            if (!Server.checkPredicates(predicates, c)) {
                Server.sendResponse(
                        httpExchange, HttpsURLConnection.HTTP_BAD_REQUEST, "Bad predicates.");
                return;
            }

            // calculate w or h if they are not pre-determined
            if (c.getwSql().length() > 0) {
                String predicate = queryMap.get("predicate" + c.getwLayerId());
                String sql = c.getwSql() + (predicate.length() > 0 ? " and " + predicate : "");
                String db = c.getDbByLayerId(c.getwLayerId());
                c.setW(getWidthOrHeightBySql(sql, db));
            }
            if (c.gethSql().length() > 0) {
                String predicate = queryMap.get("predicate" + c.gethLayerId());
                String sql = c.gethSql() + (predicate.length() > 0 ? " and " + predicate : "");
                String db = c.getDbByLayerId(c.gethLayerId());
                c.setH(getWidthOrHeightBySql(sql, db));
            }

            // get static data
            ArrayList<ArrayList<ArrayList<String>>> staticData = null;
            staticData = getStaticData(c, predicates);

            // construct the response object
            Map<String, Object> respMap = new HashMap<>();
            respMap.put("canvas", c);
            respMap.put("staticData", BoxandData.getDictionaryFromData(staticData, c));
            String response = gson.toJson(respMap);

            // send the response back
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, response);
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("\n\n" + e.getMessage() + "\n");
            Server.printServingErrorMessage();
        }
    }

    private int getWidthOrHeightBySql(String sql, String db)
            throws SQLException, ClassNotFoundException {

        return Integer.valueOf(DbConnector.getQueryResult(db, sql).get(0).get(0));
    }

    private ArrayList<ArrayList<ArrayList<String>>> getStaticData(
            Canvas c, ArrayList<String> predicates) throws Exception {

        // container for data
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();

        // loop over layers
        for (int i = 0; i < c.getLayers().size(); i++) {

            Layer l = c.getLayers().get(i);

            // add an empty placeholder for static layers
            if (!l.isStatic()) {
                data.add(new ArrayList<>());
                continue;
            }

            Indexer indexer = l.getIndexer();
            String sql = indexer.getStaticDataQuery(c, i, predicates.get(i));
            System.out.println(sql);

            // run query, add to response
            // hardcode for now for StaticAggregationIndexer
            // which needs to query raw db, rather than kyrix db
            // in the most common case
            if (l.getIndexerType().equals("StaticAggregationIndexer")) {
                data.add(DbConnector.getQueryResult(l.getTransform().getDb(), sql));
                DbConnector.closeConnection(l.getTransform().getDb());
            } else data.add(DbConnector.getQueryResult(Config.databaseName, sql));
        }

        return data;
    }
}
