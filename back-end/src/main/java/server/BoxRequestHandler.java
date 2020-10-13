package server;

import box.Box;
import box.BoxandData;
import box.MikeBoxGetter;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import javax.net.ssl.HttpsURLConnection;
import main.Main;
import project.Canvas;
import project.View;

public class BoxRequestHandler implements HttpHandler {

    // gson builder
    private final Gson gson;
    private MikeBoxGetter boxGetter;

    public BoxRequestHandler() {

        gson = new GsonBuilder().create();
        boxGetter = new MikeBoxGetter();
    }

    @Override
    public void handle(HttpExchange httpExchange) throws IOException {

        // TODO: this method should be thread safe, allowing concurrent requests
        System.out.println("\nServing /dynamic Box");

        try {
            // get data of the current request
            // variable definitions
            String response;
            String canvasId, viewId;
            double minx, miny;
            BoxandData data = null;

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
            // get parameters
            canvasId = queryMap.get("id");
            viewId = queryMap.get("viewId");
            minx = Double.valueOf(queryMap.get("x"));
            miny = Double.valueOf(queryMap.get("y"));
            Canvas c = null;
            c = Main.getProject().getCanvas(canvasId).deepCopy();
            View v = Main.getProject().getView(viewId);
            if (queryMap.containsKey("canvasw")) c.setW(Integer.valueOf(queryMap.get("canvasw")));
            if (queryMap.containsKey("canvash")) c.setH(Integer.valueOf(queryMap.get("canvash")));
            ArrayList<String> predicates = new ArrayList<>();
            for (int i = 0; i < c.getLayers().size(); i++)
                predicates.add(queryMap.get("predicate" + i));
            double oMinX = Double.valueOf(queryMap.get("oboxx"));
            double oMinY = Double.valueOf(queryMap.get("oboxy"));
            double oMaxX = oMinX + Double.valueOf(queryMap.get("oboxw"));
            double oMaxY = oMinY + Double.valueOf(queryMap.get("oboxh"));
            Box oldBox = new Box(oMinX, oMinY, oMaxX, oMaxY);
            Boolean isJumping = Boolean.valueOf(queryMap.get("isJumping"));

            // check predicates
            if (!Server.checkPredicates(predicates, c)) {
                Server.sendResponse(
                        httpExchange, HttpsURLConnection.HTTP_BAD_REQUEST, "Bad predicates.");
                return;
            }

            // get box data
            long st = System.currentTimeMillis();
            data = boxGetter.getBox(c, v, minx, miny, oldBox, predicates);
            double fetchTime = System.currentTimeMillis() - st;
            int intersectingRows = 0;
            for (int i = 0; i < data.data.size(); i++) {
                intersectingRows += data.data.get(i).size();
            }
            System.out.println("Fetch data time: " + fetchTime + "ms.");
            System.out.println("number of intersecting rows in result: " + intersectingRows);

            // TODO: improve this by not sending insert query every time there is a user
            // interaction,
            // instead, store in prepare statement (idk if that would work?)
            //  or in-memory data structure and flush to db in batches
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

            // send data and box back
            Map<String, Object> respMap = new HashMap<>();
            respMap.put("renderData", BoxandData.getDictionaryFromData(data.data, c));
            respMap.put("minx", data.box.getMinx());
            respMap.put("miny", data.box.getMiny());
            respMap.put("boxH", data.box.getHeight());
            respMap.put("boxW", data.box.getWidth());
            respMap.put("canvasId", canvasId);
            response = gson.toJson(respMap);

            // send back response
            st = System.currentTimeMillis();
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, response);
            System.out.println("Send response time: " + (System.currentTimeMillis() - st) + "ms.");
            System.out.println();
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("\n\n" + e.getMessage() + "\n");
            Server.printServingErrorMessage();
        }
    }

    private String checkParameters(Map<String, String> queryMap) {

        // check fields
        if (!queryMap.containsKey("id")) return "canvas id missing.";
        if (!queryMap.containsKey("x") || !queryMap.containsKey("y")) return "x or y missing.";

        String canvasId = queryMap.get("id");

        // check whether this canvas exists
        if (Main.getProject().getCanvas(canvasId) == null)
            return "Canvas " + canvasId + " does not exist!";

        // check passed
        return "";
    }
}
