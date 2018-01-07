package server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.internal.ObjectConstructor;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import main.Config;
import main.Main;
import project.Project;

import javax.net.ssl.HttpsURLConnection;
import java.io.IOException;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by wenbo on 1/2/18.
 */
public class FirstRequestHandler implements HttpHandler {

	// gson builder
	private Gson gson;

	public FirstRequestHandler() {
		gson = new GsonBuilder().create();
	}

	@Override
	public void handle(HttpExchange httpExchange) throws IOException {

		System.out.println("Serving /first");

		// check if this is a POST request
		if (! httpExchange.getRequestMethod().equalsIgnoreCase("POST")) {
			httpExchange.sendResponseHeaders(HttpsURLConnection.HTTP_BAD_METHOD, 0);
			httpExchange.close();
			return;
		}

		// get the project
		Project project = Main.getProject();

		// construct a response map
		Map<String, Object> respMap = new HashMap<>();
		respMap.put("project", project);
		respMap.put("tileH", Config.tileH);
		respMap.put("tileW", Config.tileW);

		// convert the response to a json object
		String response = gson.toJson(respMap);

		// send back an ok response
		httpExchange.sendResponseHeaders(HttpsURLConnection.HTTP_OK, response.getBytes().length);

		// write response
		OutputStream os = httpExchange.getResponseBody();
		os.write(response.getBytes());
		os.close();
	}
}
