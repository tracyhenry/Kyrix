package server;

import box.BoxandData;
import box.History;
import box.MikeBoxGetter;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import main.Config;
import main.Main;
import project.Canvas;
import project.Project;

import javax.net.ssl.HttpsURLConnection;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public class BoxRequestHandler  implements HttpHandler {

    // gson builder
    private final Gson gson;
    private final Project project;
    private MikeBoxGetter boxGetter;
    private History history;

    public BoxRequestHandler() {

        gson = new GsonBuilder().create();
        project = Main.getProject();
        boxGetter = new MikeBoxGetter();

    }
    @Override
    public void handle(HttpExchange httpExchange) throws IOException {

        // TODO: this method should be thread safe, allowing concurrent requests
        System.out.println("\nServing /dynamic Box");

        // get data of the current request
        // variable definitions
        String response;
        String canvasId;
        int minx, miny;
        int viewportH = Main.getProject().getViewportHeight();
        int viewportW = Main.getProject().getViewportWidth();
        BoxandData data = null;

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
        // print
        for (String s : queryMap.keySet())
            System.out.println(s + " : " + queryMap.get(s));

        // check parameters, if not pass, send a bad request response
        response = checkParameters(queryMap);
        if (response.length() > 0) {
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_REQUEST, response);
            return;
        }
        // get parameters
        canvasId = queryMap.get("id");
        minx = Integer.valueOf(queryMap.get("x"));
        miny = Integer.valueOf(queryMap.get("y"));
        Canvas c = project.getCanvas(canvasId);
        ArrayList<String> predicates = new ArrayList<>();

        for (int i = 0; i < c.getLayers().size(); i ++)
            predicates.add(queryMap.get("predicate" + i));

        //get box data
        long st = System.currentTimeMillis();
        try {
            data = boxGetter.getBox(c, minx, miny, viewportH, viewportW, predicates);
        } catch (Exception e) {
            e.printStackTrace();
        }
        System.out.println("Fetch data time: " + (System.currentTimeMillis() - st) + "ms.");

        //send data and box back
        Map<String, Object> respMap = new HashMap<>();
        respMap.put("renderData", data.data);
        respMap.put("minx", data.box.getMinx());
        respMap.put("miny", data.box.getMiny());
        respMap.put("boxH", data.box.getHight());
        respMap.put("boxW", data.box.getWidth());
        respMap.put("canvasId", canvasId);
        response = gson.toJson(respMap);

        // send back response
        st = System.currentTimeMillis();
        Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, response);
        System.out.println("Send response time: " + (System.currentTimeMillis() - st) + "ms.");
        System.out.println();
    }

    private String checkParameters(Map<String, String> queryMap) {

        // check fields
        if (! queryMap.containsKey("id"))
            return "canvas id missing.";
        if (! queryMap.containsKey("x") || ! queryMap.containsKey("y"))
            return "x or y missing.";

        String canvasId = queryMap.get("id");

        // check whether this canvas exists
        if (project.getCanvas(canvasId) == null)
            return "Canvas " + canvasId + " does not exist!";

        // check passed
        return "";
    }
}
