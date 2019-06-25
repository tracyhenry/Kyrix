package main;

import cache.TileCache;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import project.Project;
import server.Server;

public class Main {

    private static Project project = null;

    public static void main(String[] args) throws Exception {

        // for use in a Dockerfile, where we don't want to connect to the database
        if (args.length > 0 && args[0].equals("--immediate-shutdown")) {
            System.exit(0);
        }

        // read config file
        System.out.println("Reading config file...");
        readConfigFile();

        // create tile cache
        System.out.println("Creating tile cache...");
        TileCache.create();

        System.out.println("Starting server...");
        Server.startServer(Config.portNumber);
    }

    public static Project getProject() {
        return project;
    }

    public static void setProject(Project newProject) {

        System.out.println("Current project set to: " + newProject.getName());
        project = newProject;
    }

    public static void setProjectClean() throws SQLException, ClassNotFoundException {

        String sql =
                "update "
                        + Config.projectTableName
                        + " set dirty = "
                        + 0
                        + " where name = \'"
                        + project.getName()
                        + "\';";
        DbConnector.executeUpdate(Config.databaseName, sql);
    }

    private static void readConfigFile() throws IOException {

        // read config file
        BufferedReader br = new BufferedReader(new FileReader(Config.configFileName));
        String line;
        List<String> inputStrings = new ArrayList<>();
        while ((line = br.readLine()) != null) inputStrings.add(line);

        Config.portNumber = Integer.valueOf(inputStrings.get(Config.portNumberRow));
        String dbStr = inputStrings.get(Config.dbRow).toLowerCase();
        Config.database =
                (dbStr.equals("mysql")
                        ? Config.Database.MYSQL
                        : dbStr.equals("psql") ? Config.Database.PSQL : Config.Database.CITUS);
        System.out.println("dbtype: " + dbStr + "  Config.database=" + Config.database);
        Config.dbServer = inputStrings.get(Config.dbServerRow);
        Config.userName = inputStrings.get(Config.userNameRow);
        Config.password = inputStrings.get(Config.passwordRow);
        Config.databaseName = inputStrings.get(Config.kyrixDbNameRow);
        Config.d3Dir = inputStrings.get(Config.d3DirRow);
    }
}
