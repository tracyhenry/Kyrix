package server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import index.Indexer;
import index.boundingBoxIndexer;
import main.Config;
import main.Main;
import project.Canvas;
import project.Layer;
import project.Project;
import project.Transform;

import javax.net.ssl.HttpsURLConnection;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;

/**
 * Created by wenbo on 7/12/18.
 */
public class ProjectRequestHandler implements HttpHandler {

	private final Gson gson;

	public ProjectRequestHandler() {

		gson = new GsonBuilder().create();
	};

	@Override
	public void handle(HttpExchange httpExchange) throws IOException {

		System.out.println("\n\nServing /project\n New project definition coming...");

		// check if this is a POST request
		if (! httpExchange.getRequestMethod().equalsIgnoreCase("POST")) {
			Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_METHOD, "");
			return;
		}

		// extract project object
		InputStreamReader isr =  new InputStreamReader(httpExchange.getRequestBody(), "utf-8");
		BufferedReader br = new BufferedReader(isr);
		String projectJSON = br.readLine();
		Project newProject = gson.fromJson(projectJSON, Project.class);
		if (! newProject.getName().equals(Config.projectName)) {
			Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, "Not main project.");
			System.out.println("Not the main project... doing nothing");
			return ;
		}

		Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, "Good, updating main project.");

		// diff between old and new
		Project oldProject = Main.getProject();
		Main.setProject(newProject);
		try {
			if (needsReIndex(oldProject, newProject)) {
				System.out.println("There is diff that requires recomputing indexes. Shutting down server and recomputing...");
				Server.stopServer();
				Indexer indexer = new boundingBoxIndexer();
				indexer.precompute();
				System.out.println("Completed recomputing indexes. Server restarting...");
				Server.startServer(Config.portNumber);
				System.out.println("Server restarted, refresh your web page!");
			}
			else
				System.out.println("The diff does not require recompute. Refresh your web page now!");
			Main.setProjectClean();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	private boolean needsReIndex(Project oldProject, Project newProject) {

		if (oldProject == null)
			return true;

		// if the rendering param has changed, re-index is needed
		// because it might affect what the data transforms produce
		if (! oldProject.getRenderingParams().equals(newProject.getRenderingParams()))
			return true;

		// compare canvases
		ArrayList<Canvas> oldCanvases = oldProject.getCanvases();
		ArrayList<Canvas> newCanvases = newProject.getCanvases();
		// if there's different number of canvases, re-index is for sure needed
		if (oldCanvases.size() != newCanvases.size())
			return true;

		// for every old canvas, find a match
		for (Canvas oldCanvas : oldCanvases) {
			boolean matchFound = false;
			for (Canvas newCanvas : newCanvases)
				if (oldCanvas.getId().equals(newCanvas.getId())) {
					// found a match
					matchFound = true;
					ArrayList<Layer> oldLayers = oldCanvas.getLayers();
					ArrayList<Layer> newLayers = newCanvas.getLayers();
					// if there's different number of layers, re-index is for sure needed
					if (oldLayers.size() != newLayers.size())
						return true;
					// loop through every layer
					for (int i = 0; i < oldLayers.size(); i ++) {

						Layer oldLayer = oldLayers.get(i);
						Layer newLayer = newLayers.get(i);
						// see if the same layer remains the same
						if (! oldLayer.getTransformId().equals(newLayer.getTransformId()))
							return true;
						if (! (oldLayer.isStatic() == newLayer.isStatic()))
							return true;
						if (! oldLayer.isStatic() && ! oldLayer.getPlacement().toString().equals(newLayer.getPlacement().toString()))
							return true;

						// the data transform has to remain the same too
						String transformId = oldLayer.getTransformId();
						Transform oldTransform = oldCanvas.getTransformById(transformId);
						Transform newTransform = newCanvas.getTransformById(transformId);
						if (! oldTransform.toString().equals(newTransform.toString()))
							return true;
					}
				}
			if (! matchFound)
				return true;
		}

		return false;
	}
}
