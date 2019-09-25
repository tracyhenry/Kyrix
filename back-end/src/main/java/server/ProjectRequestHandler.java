package server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import index.Indexer;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import javax.net.ssl.HttpsURLConnection;
import main.Main;
import project.*;

/** Created by wenbo on 7/12/18. */
public class ProjectRequestHandler implements HttpHandler {

    private final Gson gson;
    private static HashMap<String, ArrayList<Project>> projects = new HashMap<>();

    public ProjectRequestHandler() {

        gson = new GsonBuilder().create();
    };

    private Project getLastProjectObject(String projectName) {

        if (!projects.containsKey(projectName)) return null;
        ArrayList<Project> projectsOfSameName = projects.get(projectName);
        return projectsOfSameName.get(projectsOfSameName.size() - 1);
    }

    private void addProjectObject(Project proj) {

        String projName = proj.getName();
        if (!projects.containsKey(projName)) projects.put(projName, new ArrayList<>());

        projects.get(projName).add(proj);
    }

    @Override
    public void handle(HttpExchange httpExchange) throws IOException {

        try {
            System.out.println("\n\nServing /project\n New project definition coming...");

            // check if this is a POST request
            if (!httpExchange.getRequestMethod().equalsIgnoreCase("POST")) {
                Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_METHOD, "");
                return;
            }

            // extract project object & headers
            InputStreamReader isr = new InputStreamReader(httpExchange.getRequestBody(), "utf-8");
            BufferedReader br = new BufferedReader(isr);
            String projectJSON = br.readLine();
            Project newProject = gson.fromJson(projectJSON, Project.class);
            String forceRecomputeStr =
                    httpExchange.getRequestHeaders().getFirst("X-Kyrix-Force-Recompute");
            boolean forceRecompute =
                    (forceRecomputeStr == null) ? false : forceRecomputeStr.equals("1");
            String skipRecomputeStr =
                    httpExchange.getRequestHeaders().getFirst("X-Kyrix-Skip-Recompute");
            boolean skipRecompute =
                    (skipRecomputeStr == null) ? false : skipRecomputeStr.equals("1");
            Server.sendResponse(
                    httpExchange, HttpsURLConnection.HTTP_OK, "Good, updating main project.");

            // set current project
            Main.setProject(newProject);

            // diff between old and new
            Project oldProject = getLastProjectObject(newProject.getName());
            addProjectObject(newProject);
            if (forceRecompute) {
                System.out.println(
                        "Requesting force-recompute, ignoring diff, shutting down server and recomputing...");
                Server.terminate();
            } else if (skipRecompute) {
                System.out.println(
                        "Requesting skip-recompute. Project definition updated. Refresh your web page now!");
                Indexer.associateIndexer();
                Main.setProjectClean();
            } else if (needsReIndex(oldProject, newProject)) {
                System.out.println(
                        "There is diff that requires recomputing indexes. Shutting down server and recomputing...");
                Server.terminate();
            } else {
                System.out.println(
                        "The diff does not require recompute. Refresh your web page now!");
                Indexer.associateIndexer();
                Main.setProjectClean();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // simple check for the need of reindexing. A more sophisticated checker/partial reindexing are
    // worth researching
    private boolean needsReIndex(Project oldProject, Project newProject) {

        if (oldProject == null) return true;

        // if the rendering param has changed, re-index is needed
        // because it might affect what the data transforms produce
        if (!oldProject.getRenderingParams().equals(newProject.getRenderingParams())) return true;

        // compare canvases
        ArrayList<Canvas> oldCanvases = oldProject.getCanvases();
        ArrayList<Canvas> newCanvases = newProject.getCanvases();
        // if there's different number of canvases, re-index is for sure needed
        if (oldCanvases.size() != newCanvases.size()) return true;

        // for every old canvas, find a match
        for (Canvas oldCanvas : oldCanvases) {
            boolean matchFound = false;
            for (Canvas newCanvas : newCanvases) {
                if (oldCanvas.getId().equals(newCanvas.getId())) {
                    // found a match
                    matchFound = true;

                    // if size is different, recalculate.
                    if (oldCanvas.getW() != newCanvas.getW()
                            || !oldCanvas.getwSql().equals(newCanvas.getwSql())
                            || !oldCanvas.getwLayerId().equals(newCanvas.getwLayerId()))
                        return true;

                    if (oldCanvas.getH() != newCanvas.getH()
                            || !oldCanvas.gethSql().equals(newCanvas.gethSql())
                            || !oldCanvas.gethLayerId().equals(newCanvas.gethLayerId()))
                        return true;

                    // if there's different number of layers, re-index is for sure needed
                    ArrayList<Layer> oldLayers = oldCanvas.getLayers();
                    ArrayList<Layer> newLayers = newCanvas.getLayers();
                    if (oldLayers.size() != newLayers.size()) return true;

                    // loop through every layer
                    for (int i = 0; i < oldLayers.size(); i++) {

                        Layer oldLayer = oldLayers.get(i);
                        Layer newLayer = newLayers.get(i);

                        // see if the same layer remains the same
                        if (!(oldLayer.isStatic() == newLayer.isStatic())) return true;
                        if (!oldLayer.isStatic()
                                && !oldLayer.getPlacement()
                                        .toString()
                                        .equals(newLayer.getPlacement().toString())) return true;

                        // the data transform has to remain the same too
                        Transform oldTransform = oldLayer.getTransform();
                        Transform newTransform = newLayer.getTransform();
                        if (!oldTransform.toString().equals(newTransform.toString())) return true;
                    }
                }
            }
            if (!matchFound) return true;
        }

        return false;
    }
}
