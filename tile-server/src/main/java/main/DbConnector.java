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

	private static Map<String, Statement> statements = new HashMap<>();
	private static Map<String, Connection> connections = new HashMap<>();

	public static Statement getStmtByDbName(String dbName) throws SQLException, ClassNotFoundException {

		// create db conn and statement if not existed
		if (! connections.containsKey(dbName)) {
			Connection conn = getDbConn(Main.getDbServer(), dbName, Main.getUserName(), Main.getPassword());
			Statement stmt = conn.createStatement();
			connections.put(dbName, conn);
			statements.put(dbName, stmt);
		}

		return statements.get(dbName);
	}

	private static Connection getDbConn(String dbServer, String dbName, String userName, String password) throws SQLException, ClassNotFoundException {

		Class.forName("com.mysql.jdbc.Driver");
		Connection dbConn = DriverManager.getConnection("jdbc:mysql://" + dbServer +
						"/" + dbName + "?useUnicode=true&characterEncoding=gbk&jdbcCompliantTruncation=false",
				userName, password);

		return dbConn;
	}
}
