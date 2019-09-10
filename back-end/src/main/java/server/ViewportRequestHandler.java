package server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import javax.net.ssl.HttpsURLConnection;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;

/** Created by wenbo on 2/14/18. */
public class ViewportRequestHandler implements HttpHandler {

    private final Gson gson;

    public ViewportRequestHandler() {

        gson = new GsonBuilder().create();
    }

    @Override
    public void handle(HttpExchange httpExchange) throws IOException {

        // TODO: this method should be thread safe, allowing concurrent requests
        System.out.println("Serving /viewport");

        // variable definitions
        String response;
        String canvasId;
        ArrayList<String> predicates = new ArrayList<>();
        ArrayList<String> data = null;

        // check if this is a POST request
        if (!httpExchange.getRequestMethod().equalsIgnoreCase("GET")) {
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_METHOD, "");
            return;
        }

        // get data of the current request
        String query = httpExchange.getRequestURI().getQuery();
        Map<String, String> queryMap = Server.queryToMap(query);
        // print
        for (String s : queryMap.keySet()) System.out.println(s + " : " + queryMap.get(s));
        System.out.println();

        // check parameters, if not pass, send a bad request response
        response = checkParameters(queryMap);
        if (response.length() > 0) {
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_REQUEST, response);
            return;
        }

        // get data
        canvasId = queryMap.get("canvasId");
        Canvas c = Main.getProject().getCanvas(canvasId);
        for (int i = 0; i < c.getLayers().size(); i++)
            predicates.add(queryMap.get("predicate" + i));
        try {
            data = getData(canvasId, predicates);
        } catch (Exception e) {
            e.printStackTrace();
        }

        if (data == null) {
            Server.sendResponse(
                    httpExchange, HttpsURLConnection.HTTP_BAD_REQUEST, "Bad predicates.");
            return;
        }

        // construct response
        Map<String, Object> respMap = new HashMap<>();
        respMap.put("cx", data.get(0));
        respMap.put("cy", data.get(1));
        response = gson.toJson(respMap);

        // send back response
        Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, response);
    }

    private String checkParameters(Map<String, String> queryMap) {

        // check fields
        if (!queryMap.containsKey("canvasId")) return "canvas id missing.";

        String canvasId = queryMap.get("canvasId");

        // check whether this canvas exists
        if (Main.getProject().getCanvas(canvasId) == null)
            return "Canvas " + canvasId + " does not exist!";

        Canvas c = Main.getProject().getCanvas(canvasId);
        for (int i = 0; i < c.getLayers().size(); i++)
            if (!queryMap.containsKey("predicate" + i)) return "predicate" + i + " missing.";

        // check passed
        return "";
    }

    private ArrayList<String> getData(String canvasId, ArrayList<String> predicates)
            throws SQLException, ClassNotFoundException {

        // check if only one non-empty predicate
        int nonEmptyCount = 0;
        for (int i = 0; i < predicates.size(); i++)
            if (!predicates.get(i).isEmpty()) nonEmptyCount++;
        if (nonEmptyCount != 1) return null;

        ArrayList<String> data = new ArrayList<>();

        // get the current canvas
        Canvas curCanvas = Main.getProject().getCanvas(canvasId);

        // get db connector
        Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);

        for (int i = 0; i < predicates.size(); i++) {

            if (predicates.get(i).isEmpty()) continue;
            // construct range query
            String sql =
                    "select cx, cy from bbox_"
                            + Main.getProject().getName()
                            + "_"
                            + curCanvas.getId()
                            + "layer"
                            + i
                            + " where "
                            + predicates.get(i)
                            + ";";

            // run query
            ResultSet rs = stmt.executeQuery(sql);
            int rowCount = 0;
            String cx = "", cy = "";
            while (rs.next()) {
                rowCount++;
                cx = rs.getString(1);
                cy = rs.getString(2);
            }

            System.out.println(rowCount);
            // not a predicate that uniquely determines a tuple
            if (rowCount != 1) return null;

            // return cx & cy
            data.add(cx);
            data.add(cy);
        }

        stmt.close();
        return data;
    }
}
