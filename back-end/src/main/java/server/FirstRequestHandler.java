package server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import javax.net.ssl.HttpsURLConnection;
import main.Config;
import main.Main;
import project.Project;

/** Created by wenbo on 1/2/18. */
public class FirstRequestHandler implements HttpHandler {

    // gson builder
    private final Gson gson;

    public FirstRequestHandler() {
        gson = new GsonBuilder().create();
    }

    @Override
    public void handle(HttpExchange httpExchange) throws IOException {

        System.out.println("Serving /first");

        // check if this is a POST request
        if (!httpExchange.getRequestMethod().equalsIgnoreCase("GET")) {
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_METHOD, "");
            return;
        }

        // get the project
        Project project = Main.getProject();

        // construct a response map
        Map<String, Object> respMap = new HashMap<>();
        respMap.put("project", project);
        respMap.put("tileH", Config.tileH);
        respMap.put("tileW", Config.tileW);

        // convert the response to a json object and send it back
        String response = gson.toJson(respMap);
        Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, response);
    }
}
