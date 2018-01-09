package server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Project;

import javax.net.ssl.HttpsURLConnection;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by wenbo on 1/2/18.
 */
public class TileRequestHandler implements HttpHandler {

	// gson builder
	private final Gson gson;
	private final Project project;

	public TileRequestHandler() {

		gson = new GsonBuilder().create();
		project = Main.getProject();
	}

	@Override
	public void handle(HttpExchange httpExchange) throws IOException {

		// TODO: this method should be thread safe, allowing concurrent requests
		System.out.println("Serving /tile");

		// variable definitions;
		String response;
		String canvasId;
		int minx, miny;
		ArrayList<ArrayList<String>> data = null;

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
		System.out.println();


		// check parameters, if not pass, send a bad request response
		response = checkParameters(queryMap);
		if (response.length() > 0) {
			Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_REQUEST, response);
			return;
		}

		// get data
		canvasId = queryMap.get("id");
		minx = Integer.valueOf(queryMap.get("x"));
		miny = Integer.valueOf(queryMap.get("y"));
		try {
			data = getData(canvasId, minx, miny);
		} catch (Exception e) {
			e.printStackTrace();
		}

		// construct response
		Map<String, Object> respMap = new HashMap<>();
		respMap.put("renderData", data);
		respMap.put("minx", minx);
		respMap.put("miny", miny);
		response = gson.toJson(respMap);

		// send back response
		Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, response);
	}

	// get a tile
	private ArrayList<ArrayList<String>> getData(String canvasId, int minx, int miny) throws SQLException, ClassNotFoundException {

		ArrayList<ArrayList<String>> data = new ArrayList<>();

		// get the current canvas
		Canvas curCanvas = project.getCanvas(canvasId);

		// get db connector
		Statement stmt = DbConnector.getStmtByDbName(curCanvas.getDb());

		// run query
		ResultSet rs = stmt.executeQuery(curCanvas.getQuery());
		int numColumn = rs.getMetaData().getColumnCount();
		while (rs.next()) {
			ArrayList<String> curRow = new ArrayList<>();
			for (int i = 1; i <= numColumn; i ++)
				curRow.add(rs.getString(i));
			data.add(curRow);
		}

		return data;
	}

	// check paramters
	private String checkParameters(Map<String, String> queryMap) {

		// check fields
		if (! queryMap.containsKey("id"))
			return "canvas id missing.";
		if (! queryMap.containsKey("x") || ! queryMap.containsKey("y"))
			return "x or y missing.";

		String canvasId = queryMap.get("id");
		int minx = Integer.valueOf(queryMap.get("x"));
		int miny = Integer.valueOf(queryMap.get("y"));

		// check whether this canvas exists
		if (project.getCanvas(canvasId) == null)
			return "Canvas " + canvasId + " does not exist!";

		// check whether x and y corresponds to the top-left corner of a tile
		if (minx % Config.tileW != 0 || miny % Config.tileH != 0)
			return "x and y must be a multiple of tile size!";

		// check passed
		return "";
	}
}
