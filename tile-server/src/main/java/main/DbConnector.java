package main;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * Created by wenbo on 1/7/18.
 */
public class DbConnector {

	private static Map<String, Connection> connections = new HashMap<>();

	public static Statement getStmtByDbName(String dbName) throws SQLException, ClassNotFoundException {

		// get connection
		Connection conn = getDbConn(Config.dbServer, dbName, Config.userName, Config.password);

		// set autocommit
		conn.setAutoCommit(false);

		// get statement
		Statement retStmt = null;
		retStmt = conn.createStatement();

		// set fetch size
		// NOTE: MySQL doesn't support fetch size very well. And MIN_VALUE isn't that bad.
		retStmt.setFetchSize(Config.iteratorfetchSize);

		return retStmt;
	}

	public static ArrayList<ArrayList<String>> getQueryResult(Statement stmt, String sql)
			throws SQLException, ClassNotFoundException {

		ArrayList<ArrayList<String>> result = new ArrayList<>();
		ResultSet rs = stmt.executeQuery(sql);
		int numColumn = rs.getMetaData().getColumnCount();
		while (rs.next()) {
			ArrayList<String> curRow = new ArrayList<>();
			for (int j = 1; j <= numColumn; j ++)
				curRow.add(rs.getString(j));
			result.add(curRow);
		}
		rs.close();

		return result;
	}

	public static ArrayList<ArrayList<String>> getQueryResult(String dbName, String sql)
			throws SQLException, ClassNotFoundException {

		Statement stmt = DbConnector.getStmtByDbName(dbName);
		return getQueryResult(stmt, sql);
	}

	public static ResultSet getQueryResultIterator(String dbName, String sql)
			throws SQLException, ClassNotFoundException {

		Statement stmt = DbConnector.getStmtByDbName(dbName);
		return stmt.executeQuery(sql);
	}

	public static void executeUpdate(String dbName, String sql) throws SQLException, ClassNotFoundException {

		Statement stmt = DbConnector.getStmtByDbName(dbName);
		stmt.executeUpdate(sql);
	}

	private static Connection getDbConn(String dbServer, String dbName, String userName, String password)
			throws SQLException, ClassNotFoundException {

		if (connections.containsKey(dbName))
			return connections.get(dbName);
		Connection dbConn = null;
		Class.forName("org.postgresql.Driver");
		dbConn = DriverManager.getConnection("jdbc:postgresql://" + dbServer +
						"/" + dbName + "?sendStringParametersAsUnicode=false",
				userName, password);
		connections.put(dbName, dbConn);
		return dbConn;
	}

	public static void commitConnection(String dbName) throws SQLException, ClassNotFoundException{

		Connection conn = getDbConn(Config.dbServer, dbName, Config.userName, Config.password);
		conn.commit();
	}
}
