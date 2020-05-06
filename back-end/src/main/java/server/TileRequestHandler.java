package server;

import box.BoxandData;
import cache.TileCache;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import javax.net.ssl.HttpsURLConnection;
import main.Config;
import main.Main;
import project.Canvas;

/** Created by wenbo on 1/2/18. */
public class TileRequestHandler implements HttpHandler {

    // gson builder
    private final Gson gson;

    public TileRequestHandler() {

        gson = new GsonBuilder().create();
    }

    @Override
    public void handle(HttpExchange httpExchange) throws IOException {

        // TODO: this method should be thread safe, allowing concurrent requests
        System.out.println("\nServing /tile");

        try {
            // variable definitions
            String response;
            String canvasId;
            int minx, miny;
            ArrayList<ArrayList<ArrayList<String>>> data = null;

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

            // check parameters, if not pass, send a bad request response
            response = checkParameters(queryMap);
            if (response.length() > 0) {
                Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_REQUEST, response);
                return;
            }

            // get data
            canvasId = queryMap.get("id");
            minx = Integer.valueOf(queryMap.get("x"));
            miny = Integer.valueOf(queryMap.get("y"));
            Canvas c = Main.getProject().getCanvas(canvasId);
            ArrayList<String> predicates = new ArrayList<>();
            for (int i = 0; i < c.getLayers().size(); i++)
                predicates.add(queryMap.get("predicate" + i));
            Boolean isJumping = Boolean.valueOf(queryMap.get("isJumping"));

            // check predicates
            if (!Server.checkPredicates(predicates, c)) {
                Server.sendResponse(
                        httpExchange, HttpsURLConnection.HTTP_BAD_REQUEST, "Bad predicates.");
                return;
            }

            // fetch data
            long st = System.currentTimeMillis();
            data = TileCache.getTile(c, minx, miny, predicates);
            double fetchTime = System.currentTimeMillis() - st;
            int intersectingRows = 0;
            for (int i = 0; i < data.size(); i++) {
                intersectingRows += data.get(i).size();
            }
            System.out.println("Fetch data time: " + fetchTime + "ms.");
            System.out.println("number of intersecting rows in result: " + intersectingRows);

            if (isJumping) {
                Server.sendStats(
                        Main.getProject().getName(),
                        c.getId(),
                        "jump",
                        fetchTime,
                        intersectingRows);
            } else {
                Server.sendStats(
                        Main.getProject().getName(), c.getId(), "pan", fetchTime, intersectingRows);
            }

            // construct response
            Map<String, Object> respMap = new HashMap<>();
            respMap.put("renderData", BoxandData.getDictionaryFromData(data, c));
            respMap.put("minx", minx);
            respMap.put("miny", miny);
            respMap.put("canvasId", canvasId);
            response = gson.toJson(respMap);

            // send back response
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, response);
            System.out.println();
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("\n\n" + e.getMessage() + "\n");
            Server.printServingErrorMessage();
        }
    }

    // check paramters
    private String checkParameters(Map<String, String> queryMap) {

        // check fields
        if (!queryMap.containsKey("id")) return "canvas id missing.";
        if (!queryMap.containsKey("x") || !queryMap.containsKey("y")) return "x or y missing.";

        String canvasId = queryMap.get("id");
        int minx = Integer.valueOf(queryMap.get("x"));
        int miny = Integer.valueOf(queryMap.get("y"));

        // check whether this canvas exists
        if (Main.getProject().getCanvas(canvasId) == null)
            return "Canvas " + canvasId + " does not exist!";

        // check whether x and y corresponds to the top-left corner of a tile
        if (minx % Config.tileW != 0 || miny % Config.tileH != 0)
            return "x and y must be a multiple of tile size!";

        // check passed
        return "";
    }
}
