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
 * Created by wenbo on 2/14/18.
 */
public class ViewportRequestHandler implements HttpHandler {

	private final Gson gson;
	private final Project project;

	public ViewportRequestHandler() {

		gson = new GsonBuilder().create();
		project = Main.getProject();
	}

	@Override
	public void handle(HttpExchange httpExchange) throws IOException {

		// TODO: this method should be thread safe, allowing concurrent requests
		System.out.println("Serving /viewport");

		// variable definitions
		String response;
		String canvasId;
		String predicate;
		ArrayList<String> data = null;

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
		canvasId = queryMap.get("canvasId");
		predicate = queryMap.get("predicate");
		try {
			data = getData(canvasId, predicate);
		} catch (Exception e) {
			e.printStackTrace();
		}

		if (data == null)
		{
			Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_REQUEST, "Bad predicate.");
			return ;
		}

		// construct response
		Map<String, Object> respMap = new HashMap<>();
		respMap.put("cx", data.get(0));
		respMap.put("cy", data.get(1));
		response = gson.toJson(respMap);

		// send back response
		Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, response);
	}

	private String checkParameters(Map<String, String> queryMap) {

		// check fields
		if (! queryMap.containsKey("canvasId"))
			return "canvas id missing.";
		if (! queryMap.containsKey("predicate"))
			return "predicate missing.";

		String canvasId = queryMap.get("canvasId");
		String predicate = queryMap.get("predicate");

		// check whether this canvas exists
		if (project.getCanvas(canvasId) == null)
			return "Canvas " + canvasId + " does not exist!";

		// check passed
		return "";
	}

	private ArrayList<String> getData(String canvasId, String predicate)
			throws SQLException, ClassNotFoundException {

		ArrayList<String> data = new ArrayList<>();

		// get the current canvas
		Canvas curCanvas = project.getCanvas(canvasId);

		// get db connector
		Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);

		// construct range query
		String sql = "select cx, cy from bbox_" + curCanvas.getId() + " where "
				+ predicate + ";";
		System.out.println(canvasId + " " + predicate + " : " + sql);

		// run query
		ResultSet rs = stmt.executeQuery(sql);
		int rowCount = 0;
		String cx = "", cy = "";
		while (rs.next()) {
			rowCount ++;
			cx = rs.getString(1);
			cy = rs.getString(2);
		}

		// not a predicate that uniquely determines a tuple
		if (rowCount != 1)
			return null;

		// return cx & cy
		data.add(cx);
		data.add(cy);
		return data;
	}
}
