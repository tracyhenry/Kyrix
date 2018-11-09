package server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Project;

import javax.net.ssl.HttpsURLConnection;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
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
        Canvas curCanvas = Main.getProject().getCanvas(canvasId);
        if (curCanvas == null) {
            // canvas id does not exist and send back a bad request response
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_REQUEST, "canvas " + query + " does not exist.");
            return ;
        }

        // list of predicates
        ArrayList<String> predicates = new ArrayList<>();
        for (int i = 0; i < curCanvas.getLayers().size(); i ++)
            predicates.add(queryMap.get("predicate" + i));

        // calculate w or h if they are not pre-determined
        if (curCanvas.getwSql().length() > 0) {
            String predicate = queryMap.get("predicate" + curCanvas.getwLayerId());
            String sql = curCanvas.getwSql() + " and " + predicate;
            String db = curCanvas.getDbByLayerId(curCanvas.getwLayerId());
            try {
                curCanvas.setW(getWidthOrHeightBySql(sql, db));
            } catch (Exception e) {}
        }
        if (curCanvas.gethSql().length() > 0) {
            String predicate = queryMap.get("predicate" + curCanvas.gethLayerId());
            String sql = curCanvas.gethSql() + " and " + predicate;
            String db = curCanvas.getDbByLayerId(curCanvas.gethLayerId());
            try {
                curCanvas.setH(getWidthOrHeightBySql(sql, db));
            } catch (Exception e) {}
        }

        // get static data
        ArrayList<ArrayList<ArrayList<String>>> staticData = null;
        try {
            staticData = getStaticData(curCanvas, predicates);
        } catch (Exception e) {
            e.printStackTrace();
        }

        // construct the response object
        Map<String, Object> respMap = new HashMap<>();
        respMap.put("canvas", curCanvas);
        respMap.put("jump", Main.getProject().getJumps(canvasId));
        respMap.put("staticData", staticData);
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

        // get db connector for reuse among layers
        Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);

        // loop through each layer
        for (int i = 0; i < c.getLayers().size(); i ++) {

            if (! c.getLayers().get(i).isStatic()) {
                data.add(new ArrayList<ArrayList<String>>());
                continue;
            }
            // construct range query
            String sql = "select * from bbox_" + Config.projectName + "_"
                    + c.getId() + "layer" + i;
            if (predicates.get(i).length() > 0)
                sql += " where " + predicates.get(i);
            sql += ";";

            // run query, add to response
            data.add(DbConnector.getQueryResult(stmt, sql));
        }

        stmt.close();
        return data;
    }
}
