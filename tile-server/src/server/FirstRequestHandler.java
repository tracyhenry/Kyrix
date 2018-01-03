package server;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import main.Main;

import javax.net.ssl.HttpsURLConnection;
import java.io.IOException;
import java.io.OutputStream;

/**
 * Created by wenbo on 1/2/18.
 */
public class FirstRequestHandler implements HttpHandler {

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
		httpExchange.sendResponseHeaders(HttpsURLConnection.HTTP_OK, Main.projectJSON.getBytes().length);

		// write response
		OutputStream os = httpExchange.getResponseBody();
		os.write(Main.projectJSON.getBytes());
		os.close();

	}
}
