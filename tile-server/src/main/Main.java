package main;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import project.Project;
import server.*;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class Main {

	private static String projectName;
	private static String dbServer;
	private static String userName;
	private static String password;
	private static String projectJSON;
	private static int portNumber;
	private static Project project;

	public static void main(String[] args) throws IOException, ClassNotFoundException, SQLException {

		// read config file
		readConfigFile();

		// get project definition, create project object
		getProjectJSON();
		Gson gson = new GsonBuilder().create();
		project = gson.fromJson(projectJSON, Project.class);

		// precompute

		// start server
		Server.startServer(portNumber);
	}

	public static Project getProject() {
		return project;
	}

	public static String getDbServer() {
		return dbServer;
	}

	public static String getUserName() {
		return userName;
	}

	public static String getPassword() {
		return password;
	}

	private static void readConfigFile() throws IOException {

		// read config file
		BufferedReader br = new BufferedReader(new FileReader(Config.configFileName));
		String line;
		List<String> inputStrings = new ArrayList<>();
		while ((line = br.readLine()) != null)
			inputStrings.add(line);

		projectName = inputStrings.get(Config.projectNameRow);
		portNumber = Integer.valueOf(inputStrings.get(Config.portNumberRow));
		dbServer = inputStrings.get(Config.dbServerRow);
		userName = inputStrings.get(Config.userNameRow);
		password = inputStrings.get(Config.passwordRow);

	}

	private static void getProjectJSON() throws SQLException, ClassNotFoundException {

		String sql = "SELECT * FROM " + Config.projectTableName + " WHERE name = \"" + projectName + "\";";
		Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);
		ResultSet rs = stmt.executeQuery(sql);
		while (rs.next())
			projectJSON = rs.getString(Config.contentColumn);
	}
}
