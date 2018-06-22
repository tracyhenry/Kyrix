package main;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import index.Indexer;
import index.PlacementNaiveIndexer;
import project.Project;
import server.Server;
import cache.TileCache;

import javax.script.ScriptException;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class Main {

	private static Project project;
	public static String projectJSON;

	public static void main(String[] args) throws IOException,
			ClassNotFoundException,
			SQLException,
			ScriptException,
			NoSuchMethodException {

		// read config file
		readConfigFile();

		// get project definition, create project object
		getProjectJSON();
		Gson gson = new GsonBuilder().create();
		project = gson.fromJson(projectJSON, Project.class);
		System.out.println(project);

		// precompute
		Indexer indexer = new PlacementNaiveIndexer();
		indexer.precompute();

		//cache
		TileCache.create();

		// start server
		Server.startServer(Config.portNumber);
	}

	public static Project getProject() {
		return project;
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
		Config.dbServer = inputStrings.get(Config.dbServerRow);
		Config.userName = inputStrings.get(Config.userNameRow);
		Config.password = inputStrings.get(Config.passwordRow);
		Config.d3Dir = inputStrings.get(Config.d3DirRow);

	}

	private static void getProjectJSON() throws SQLException, ClassNotFoundException {

		String sql = "SELECT * FROM " + Config.projectTableName + " WHERE name = \"" + Config.projectName + "\";";
		Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);
		ResultSet rs = stmt.executeQuery(sql);
		while (rs.next())
			projectJSON = rs.getString(Config.contentColumn);
		stmt.close();
	}
}
