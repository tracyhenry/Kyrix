package server;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import javax.net.ssl.HttpsURLConnection;
import java.io.IOException;

/**
 * Created by wenbo on 1/2/18.
 */
public class TileRequestHandler implements HttpHandler {

	@Override
	public void handle(HttpExchange httpExchange) throws IOException {

		System.out.println("Serving /tile");

		// check if this is a POST request
		if (! httpExchange.getRequestMethod().equalsIgnoreCase("POST")) {
			httpExchange.sendResponseHeaders(HttpsURLConnection.HTTP_BAD_METHOD, 0);
			httpExchange.close();
			return;
		}
	}
}
