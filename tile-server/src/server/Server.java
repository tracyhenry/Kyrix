package server;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by wenbo on 1/8/18.
 */
public class Server {

	public static void startServer(int portNumber) throws IOException {

		HttpServer server = HttpServer.create(new InetSocketAddress(portNumber), 0);
		server.createContext("/", new IndexHandler());
		server.createContext("/first", new FirstRequestHandler());
		server.createContext("/tile", new TileRequestHandler());
		server.createContext("/canvas", new CanvasRequestHandler());
		server.setExecutor(null); // TODO: the default executor is not parallel
		server.start();
	}

	public static void sendResponse(HttpExchange httpExchange, int responseCode, String response) throws IOException {

		// write response
		httpExchange.sendResponseHeaders(responseCode, response.getBytes().length);
		OutputStream os = httpExchange.getResponseBody();
		os.write(response.getBytes());
		os.close();
		httpExchange.close();
	}

	// https://stackoverflow.com/questions/11640025/how-to-obtain-the-query-string-in-a-get-with-java-httpserver-httpexchange
	public static Map<String, String> queryToMap(String query) {

		Map<String, String> result = new HashMap<>();
		// check if query is null
		if (query == null)
			return result;
		for (String param : query.split("&")) {
			String pair[] = param.split("=");
			if (pair.length>1)
				result.put(pair[0], pair[1]);
			else
				result.put(pair[0], "");
		}
		return result;
	}
}
