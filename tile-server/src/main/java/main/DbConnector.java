package main;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
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

		return conn.createStatement();
	}

	private static Connection getDbConn(String dbServer, String dbName, String userName, String password) throws SQLException, ClassNotFoundException {

		Class.forName("com.mysql.jdbc.Driver");
		Connection dbConn = DriverManager.getConnection("jdbc:mysql://" + dbServer +
						"/" + dbName + "?useUnicode=true&characterEncoding=gbk&jdbcCompliantTruncation=false",
				userName, password);

		return dbConn;
	}
}
