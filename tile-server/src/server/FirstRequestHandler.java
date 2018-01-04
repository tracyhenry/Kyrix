package server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import main.Main;
import project.Project;

import javax.net.ssl.HttpsURLConnection;
import java.io.IOException;
import java.io.OutputStream;

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

		// send back a ok response
		Project project = Main.getProject();

		// convert the response to a json object
		String response = gson.toJson(project);
		httpExchange.sendResponseHeaders(HttpsURLConnection.HTTP_OK, response.getBytes().length);

		// write response
		OutputStream os = httpExchange.getResponseBody();
		os.write(response.getBytes());
		os.close();
	}
}
