package main;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import index.Indexer;
import project.Project;
import server.Server;
import cache.TileCache;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class Main {

    private static Project project = null;
    public static String projectJSON = "";

    public static void main(String[] args) throws Exception {

        // read config file
        readConfigFile();

        // get project definition, create project object
        getProjectObject();

        // if project object is not null and is dirty, precompute
        if (project != null && isProjectDirty()) {
            System.out.println("Main project definition has been changed since last session, re-calculating indexes...");
            Indexer.precompute();
            setProjectClean();
        }
        else if (project != null) {
            Indexer.associateIndexer();
            System.out.println("Main project definition has not been changed since last session. Starting server right away...");
        }


        //cache
        TileCache.create();

        // start server
        Server.startServer(Config.portNumber);
    }

    public static Project getProject() {
        return project;
    }

    public static void setProject(Project newProject) {

        project = newProject;
    }

    public static boolean isProjectDirty() throws SQLException, ClassNotFoundException {

        String sql = "select dirty from " + Config.projectTableName + " where name = \'" + Config.projectName + "\';";
        ArrayList<ArrayList<String>> ret = DbConnector.getQueryResult(Config.databaseName, sql);
        return (Integer.valueOf(ret.get(0).get(0)) == 1);
    }

    public static void setProjectClean() throws SQLException, ClassNotFoundException {

        String sql = "update " + Config.projectTableName + " set dirty = " + 0 + " where name = \'" + Config.projectName + "\';";
        DbConnector.executeUpdate(Config.databaseName, sql);
        DbConnector.commitConnection(Config.databaseName);
    }

    private static void readConfigFile() throws IOException {

        // read config file
        BufferedReader br = new BufferedReader(new FileReader(Config.configFileName));
        String line;
        List<String> inputStrings = new ArrayList<>();
        while ((line = br.readLine()) != null)
            inputStrings.add(line);

        Config.projectName = inputStrings.get(Config.projectNameRow);
        Config.portNumber = Integer.valueOf(inputStrings.get(Config.portNumberRow));
        Config.database = (inputStrings.get(Config.dbRow).toLowerCase().equals("mysql") ?
                Config.Database.MYSQL : Config.Database.PSQL);
        Config.dbServer = inputStrings.get(Config.dbServerRow);
        Config.userName = inputStrings.get(Config.userNameRow);
        Config.password = inputStrings.get(Config.passwordRow);
        Config.databaseName = inputStrings.get(Config.kyrixDbNameRow);
        Config.d3Dir = inputStrings.get(Config.d3DirRow);
    }

    private static void getProjectObject() throws ClassNotFoundException, SQLException {

        String sql = "select content from " + Config.projectTableName + " where name = \'" + Config.projectName + "\';";
        try {
            ArrayList<ArrayList<String>> ret = DbConnector.getQueryResult(Config.databaseName, sql);
            projectJSON = ret.get(0).get(0);
            Gson gson = new GsonBuilder().create();
            project = gson.fromJson(projectJSON, Project.class);
        } catch (Exception e) {
            System.out.println("Cannot find definition of main project... waiting...");
        }
        DbConnector.commitConnection(Config.databaseName);
    }
}
