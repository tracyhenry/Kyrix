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

		// create db conn and statement if not existed
		Connection conn;
		if (! connections.containsKey(dbName)) {
			conn = getDbConn(Config.dbServer, dbName, Config.userName, Config.password);
			connections.put(dbName, conn);
		}
		else
			conn = connections.get(dbName);

		return conn.createStatement(ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);
	}

	public static ArrayList<ArrayList<String>> getQueryResult(Statement stmt, String sql)
			throws SQLException, ClassNotFoundException {

		ArrayList<ArrayList<String>> result = new ArrayList<>();
		stmt.setFetchSize(Integer.MIN_VALUE);
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

	private static Connection getDbConn(String dbServer, String dbName, String userName, String password)
			throws SQLException, ClassNotFoundException {

		Class.forName("com.mysql.jdbc.Driver");
		Connection dbConn = DriverManager.getConnection("jdbc:mysql://" + dbServer +
						"/" + dbName + "?sendStringParametersAsUnicode=false",
				userName, password);

		return dbConn;
	}
}
