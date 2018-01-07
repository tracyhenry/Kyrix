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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

/**
 * Created by wenbo on 1/2/18.
 */
public class TileRequestHandler implements HttpHandler {

	// gson builder
	private Gson gson;
	private Random rand;
	private ArrayList<ArrayList<Integer>> data;

	public TileRequestHandler() {
		gson = new GsonBuilder().create();
		rand = new Random();
		data = new ArrayList<>();
		for (int i = 0; i < 20; i ++)
		{
			ArrayList<Integer> curList = new ArrayList<>();
			curList.add(rand.nextInt(800));
			curList.add(rand.nextInt(800));
			data.add(curList);
		}

	}

	@Override
	public void handle(HttpExchange httpExchange) throws IOException {

		System.out.println("Serving /tile");

		// check if this is a POST request
		if (! httpExchange.getRequestMethod().equalsIgnoreCase("POST")) {
			httpExchange.sendResponseHeaders(HttpsURLConnection.HTTP_BAD_METHOD, 0);
			httpExchange.close();
			return;
		}

		// response
		Project project = Main.getProject();
		Map<String, Object> respMap = new HashMap<>();
		respMap.put("renderData", data);
		respMap.put("renderFunc", project.getCanvases().get(0).getRendering());
		String response = gson.toJson(respMap);
		httpExchange.sendResponseHeaders(HttpsURLConnection.HTTP_OK, response.getBytes().length);

		// write response
		OutputStream os = httpExchange.getResponseBody();
		os.write(response.getBytes());
		os.close();
	}
}
