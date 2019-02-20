package server;

import box.BoxandData;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;

import javax.net.ssl.HttpsURLConnection;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by wenbo on 1/8/18.
 */
public class CanvasRequestHandler implements HttpHandler {

    private final Gson gson;

    public CanvasRequestHandler() {

        gson = new GsonBuilder().create();
    }

    @Override
    public void handle(HttpExchange httpExchange) throws IOException {

        System.out.println("Serving /canvas");

        // check if this is a POST request
        if (! httpExchange.getRequestMethod().equalsIgnoreCase("POST")) {
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_METHOD, "");
            return;
        }

        // get data of the current request
        InputStreamReader isr =  new InputStreamReader(httpExchange.getRequestBody(), "utf-8");
        BufferedReader br = new BufferedReader(isr);
        String query = br.readLine();
        Map<String, String> queryMap = Server.queryToMap(query);
        String canvasId = queryMap.get("id");

        // get the current canvas
        Canvas c = null;
        try {
            c = Main.getProject().getCanvas(canvasId).deepCopy();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // list of predicates
        ArrayList<String> predicates = new ArrayList<>();
        for (int i = 0; i < c.getLayers().size(); i ++)
            predicates.add(queryMap.get("predicate" + i));

        // calculate w or h if they are not pre-determined
        if (c.getwSql().length() > 0) {
            String predicate = queryMap.get("predicate" + c.getwLayerId());
            String sql = c.getwSql() + " and " + predicate;
            String db = c.getDbByLayerId(c.getwLayerId());
            try {
                c.setW(getWidthOrHeightBySql(sql, db));
            } catch (Exception e) {}
        }
        if (c.gethSql().length() > 0) {
            String predicate = queryMap.get("predicate" + c.gethLayerId());
            String sql = c.gethSql() + " and " + predicate;
            String db = c.getDbByLayerId(c.gethLayerId());
            try {
                c.setH(getWidthOrHeightBySql(sql, db));
            } catch (Exception e) {}
        }

        // get static data
        ArrayList<ArrayList<ArrayList<String>>> staticData = null;
        try {
            staticData = getStaticData(c, predicates);
        } catch (Exception e) {
            e.printStackTrace();
        }

        // construct the response object
        Map<String, Object> respMap = new HashMap<>();
        respMap.put("canvas", c);
        respMap.put("staticData", BoxandData.getDictionaryFromData(staticData, c));
        String response = gson.toJson(respMap);

        // send the response back
        Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, response);
    }

    private int getWidthOrHeightBySql(String sql, String db) throws SQLException, ClassNotFoundException {

        return Integer.valueOf(DbConnector.getQueryResult(db, sql).get(0).get(0));
    }

    private ArrayList<ArrayList<ArrayList<String>>> getStaticData(Canvas c, ArrayList<String> predicates)
            throws SQLException, ClassNotFoundException {

        // container for data
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();

        // loop over layers
        for (int i = 0; i < c.getLayers().size(); i ++) {

            // add an empty placeholder for static layers
            if (! c.getLayers().get(i).isStatic()) {
                data.add(new ArrayList<>());
                continue;
            }

            // get column list string
            String colListStr = c.getLayers().get(i).getTransform().getColStr("");

            // construct range query
            String sql = "select " + colListStr + " from bbox_" + Config.projectName + "_"
                    + c.getId() + "layer" + i;
            if (predicates.get(i).length() > 0)
                sql += " where " + predicates.get(i);
            sql += ";";

            // run query, add to response
            data.add(DbConnector.getQueryResult(Config.databaseName, sql));
        }

        return data;
    }
}
