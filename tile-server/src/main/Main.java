package main;

import com.sun.net.httpserver.HttpServer;
import server.FirstRequestHandler;
import server.IndexHandler;
import server.TileRequestHandler;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class Main {

	private static Connection dbConn = null;
	private static String projectName, dbServer, userName, password;
	public static String projectJSON;
	private static int portNumber;


	public static void main(String[] args) throws IOException, ClassNotFoundException, SQLException {

		// connect to db
		connectDB();

		// get project definition, create project object
		getProjectJSON();
		//System.out.println(projectJSON);

		// precompute

		// start server
		startServer();
	}

	private static void connectDB() throws IOException, ClassNotFoundException, SQLException {

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

		// connect db
		Class.forName("com.mysql.jdbc.Driver");
		dbConn = DriverManager.getConnection("jdbc:mysql://" + dbServer +
						"/" + Config.databaseName + "?useUnicode=true&characterEncoding=gbk&jdbcCompliantTruncation=false",
				userName, password);
	}

	private static void getProjectJSON() throws SQLException {
		String sql = "SELECT * FROM " + Config.projectTableName + " WHERE name = \"" + projectName + "\";";
		Statement stmt = dbConn.createStatement();
		ResultSet rs = stmt.executeQuery(sql);
		while (rs.next())
			projectJSON = rs.getString(Config.contentColumn);
	}

	private static void startServer() throws IOException {
		HttpServer server = HttpServer.create(new InetSocketAddress(portNumber), 0);
		server.createContext("/", new IndexHandler());
		server.createContext("/first", new FirstRequestHandler());
		server.createContext("/tile", new TileRequestHandler());
		server.setExecutor(null); // TODO: the default executor is not parallel
		server.start();
	}
}
