package server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
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
import java.util.HashMap;
import java.util.Map;

/**
 * Created by wenbo on 1/8/18.
 */
public class CanvasRequestHandler implements HttpHandler {

	private final Gson gson;
	private final Project project;

	public CanvasRequestHandler() {

		gson = new GsonBuilder().create();
		project = Main.getProject();
	}

	@Override
	public void handle(HttpExchange httpExchange) throws IOException {

		// TODO: this method should be thread safe, allowing concurrent requests
		System.out.println("Serving /canvas");

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
		String canvasId = queryMap.get("id");

		// get the current canvas
		Canvas curCanvas = project.getCanvas(canvasId);
		if (curCanvas == null) {
			// canvas id does not exist and send back a bad request response
			Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_REQUEST, "canvas " + query + " does not exist.");
			return ;
		}

		// calculate w or h if they are not pre-determined
		if (curCanvas.getwSql().length() > 0) {
			String predicate = queryMap.get("predicate" + curCanvas.getwLayerId());
			String sql = curCanvas.getwSql() + " and " + predicate;
			String db = curCanvas.getDbByLayerId(curCanvas.getwLayerId());
			try {
				curCanvas.setW(getWidthOrHeightBySql(sql, db));
			} catch (Exception e) {}
		}

		if (curCanvas.gethSql().length() > 0) {
			String predicate = queryMap.get("predicate" + curCanvas.gethLayerId());
			String sql = curCanvas.gethSql() + " and " + predicate;
			String db = curCanvas.getDbByLayerId(curCanvas.gethLayerId());
			try {
				curCanvas.setH(getWidthOrHeightBySql(sql, db));
			} catch (Exception e) {}
		}

		// construct the response object
		Map<String, Object> respMap = new HashMap<>();
		respMap.put("canvas", curCanvas);
		respMap.put("jump", project.getJumps(canvasId));
		String response = gson.toJson(respMap);

		// send the response back
		Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, response);
	}

	private int getWidthOrHeightBySql(String sql, String db) throws SQLException, ClassNotFoundException {

		Statement curStmt = DbConnector.getStmtByDbName(db);
		ResultSet rs = curStmt.executeQuery(sql);
		rs.next();
		return rs.getInt(1);
	}
}
