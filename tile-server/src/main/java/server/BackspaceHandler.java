package server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import main.Main;
import project.Project;
import editing.Labeler;

import javax.net.ssl.HttpsURLConnection;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;

public class BackspaceHandler  implements HttpHandler {

    // gson builder
    private final Gson gson;
    private final Project project;
    private final Labeler labeler;

    public BackspaceHandler() {

        gson = new GsonBuilder().create();
        project = Main.getProject();
        labeler = new Labeler();

    }
    @Override
    public void handle(HttpExchange httpExchange) throws IOException {

        // TODO: this method should be thread safe, allowing concurrent requests
        System.out.println("\nBackspace data");

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
        String response = checkParameters(queryMap);
        if (response.length() > 0) {
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_REQUEST, response);
            return;
        }
        // get parameters
        String item = queryMap.get("item");
        String label = queryMap.get("label");
        String user = queryMap.get("labeler");

        //execute query parameters only
        try {
            response = labeler.backspace("neweeglabels", user, label, item).toString();
        }
        catch(Exception e) {
            Server.sendResponse(httpExchange, 500, e.getMessage());
        }

        // send back response
        Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, response);
        System.out.println();
    }

    // validate parameters completion
    private String checkParameters(Map<String, String> queryMap) {
        if(!queryMap.containsKey("item")){
            return "No item to label.";
        }
        if(!queryMap.containsKey("labeler")){
            return "No labeler.";
        }
        if(!queryMap.containsKey("label")){
            return "No label.";
        }
        return "";
    }
}
