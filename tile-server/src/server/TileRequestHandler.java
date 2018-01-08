package server;

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
	private String response;
	private Project project;
	private ArrayList<ArrayList<Integer>> data;
	private String canvasId;
	private int minx, miny;

	public TileRequestHandler() {
		gson = new GsonBuilder().create();
		project = Main.getProject();
		Random rand = new Random();
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

		// TODO: this method should be thread safe, allowing concurrent requests
		System.out.println("Serving /tile");

		// check if this is a POST request
		if (! httpExchange.getRequestMethod().equalsIgnoreCase("POST")) {
			httpExchange.sendResponseHeaders(HttpsURLConnection.HTTP_BAD_METHOD, 0);
			httpExchange.close();
			return;
		}

		// get data of the current request
		InputStreamReader isr =  new InputStreamReader(httpExchange.getRequestBody(), "utf-8");
		BufferedReader br = new BufferedReader(isr);
		String query = br.readLine();
		Map<String, String> queryMap = queryToMap(query);
		// print
		for (String s : queryMap.keySet())
			System.out.println(s + " : " + queryMap.get(s));
		System.out.println();


		// check parameters, send a bad request response
		if (! checkParameters(queryMap)) {
			sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_REQUEST);
			return;
		}

		// get data
		getData();

		// construct response
		Map<String, Object> respMap = new HashMap<>();
		respMap.put("renderData", data);
		response = gson.toJson(respMap);

		// send back response
		sendResponse(httpExchange, HttpsURLConnection.HTTP_OK);
	}

	// get data
	private void getData() {

	}

	// check paramters, also assign fields minx, miny and canvasId
	private boolean checkParameters(Map<String, String> queryMap) {

		// check fields
		if (! queryMap.containsKey("id")) {
			response = "canvas id missing.";
			return false;
		}
		if (! queryMap.containsKey("x") || ! queryMap.containsKey("y")) {
			response = "x or y missing.";
			return false;
		}

		// assign fields
		canvasId = queryMap.get("id");
		minx = Integer.valueOf(queryMap.get("x"));
		miny = Integer.valueOf(queryMap.get("y"));

		// check whether this canvas exists
		boolean exist = false;
		for (Canvas c : project.getCanvases())
			if (c.getId().equals(canvasId))
				exist = true;
		if (! exist) {
			response = "Canvas " + canvasId + " does not exist!";
			return false;
		}

		// check whether x and y corresponds to the top-left corner of a tile
		if (minx % Config.tileW != 0 || miny % Config.tileH != 0) {
			response = "x and y must be a multiple of tile size!";
			return false;
		}

		// check passed
		return true;
	}

	// send response
	private void sendResponse(HttpExchange httpExchange, int responseCode) throws IOException {

		// write response
		httpExchange.sendResponseHeaders(responseCode, response.getBytes().length);
		OutputStream os = httpExchange.getResponseBody();
		os.write(response.getBytes());
		os.close();
	}

	// https://stackoverflow.com/questions/11640025/how-to-obtain-the-query-string-in-a-get-with-java-httpserver-httpexchange
	private Map<String, String> queryToMap(String query) {

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
