package main;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/** Created by wenbo on 1/7/18. */
public class DbConnector {

    private static Map<String, Connection> connections = new HashMap<>();

    // isbatch must be specified if fetching a lot of data
    public static Statement getStmtByDbName(String dbName, boolean isBatch)
            throws SQLException, ClassNotFoundException {

        // get connection
        Connection conn =
                getDbConn(Config.dbServer, dbName, Config.userName, Config.password, isBatch);

        // get statement
        Statement retStmt = null;
        if (Config.database == Config.Database.PSQL || Config.database == Config.Database.CITUS)
            retStmt = conn.createStatement();
        else if (Config.database == Config.Database.MYSQL)
            retStmt = conn.createStatement(ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);

        // set fetch size
        // NOTE: MySQL doesn't support fetch size very well. And MIN_VALUE isn't that bad.
        if (Config.database == Config.Database.MYSQL) retStmt.setFetchSize(Integer.MIN_VALUE);
        else retStmt.setFetchSize(Config.iteratorfetchSize);

        return retStmt;
    }

    public static Statement getStmtByDbName(String dbName)
            throws SQLException, ClassNotFoundException {

        return getStmtByDbName(dbName, false);
    }

    // get prepared statement for an update query
    public static PreparedStatement getPreparedStatement(String dbName, String sql)
            throws SQLException, ClassNotFoundException {

        // get connection
        Connection conn =
                getDbConn(Config.dbServer, dbName, Config.userName, Config.password, false);
        return conn.prepareStatement(sql);
    }

    private static ArrayList<ArrayList<String>> getQueryResult(Statement stmt, String sql)
            throws SQLException, ClassNotFoundException {

        ArrayList<ArrayList<String>> result = new ArrayList<>();
        ResultSet rs = stmt.executeQuery(sql);
        int numColumn = rs.getMetaData().getColumnCount();
        while (rs.next()) {
            ArrayList<String> curRow = new ArrayList<>();
            for (int j = 1; j <= numColumn; j++) curRow.add(rs.getString(j));
            result.add(curRow);
        }
        rs.close();

        return result;
    }

    public static ArrayList<ArrayList<String>> getQueryResult(String dbName, String sql)
            throws SQLException, ClassNotFoundException {

        Statement stmt = DbConnector.getStmtByDbName(dbName);
        ArrayList<ArrayList<String>> ret = getQueryResult(stmt, sql);
        stmt.close();
        closeConnection(dbName);
        return ret;
    }

    public static ResultSet getQueryResultIterator(Statement stmt, String sql)
            throws SQLException, ClassNotFoundException {

        return stmt.executeQuery(sql);
    }

    public static void executeUpdate(String dbName, String sql)
            throws SQLException, ClassNotFoundException {

        Statement stmt = DbConnector.getStmtByDbName(dbName);
        stmt.executeUpdate(sql);
        stmt.close();
    }

    private static Connection getDbConn(
            String dbServer, String dbName, String userName, String password, boolean isBatch)
            throws SQLException, ClassNotFoundException {

        String key = dbName;
        if (Config.database == Config.Database.PSQL && isBatch) key += "_batch";
        if (connections.containsKey(key)) return connections.get(key);
        Connection dbConn = null;
        if (Config.database == Config.Database.PSQL || Config.database == Config.Database.CITUS) {
            Class.forName("org.postgresql.Driver");
            dbConn =
                    DriverManager.getConnection(
                            "jdbc:postgresql://"
                                    + dbServer
                                    + "/"
                                    + dbName
                                    + "?sendStringParametersAsUnicode=false",
                            userName,
                            password);
        } else if (Config.database == Config.Database.MYSQL) {
            Class.forName("com.mysql.jdbc.Driver");
            dbConn =
                    DriverManager.getConnection(
                            "jdbc:mysql://"
                                    + dbServer
                                    + "/"
                                    + dbName
                                    + "?sendStringParametersAsUnicode=false",
                            userName,
                            password);
        }
        // to enable fetching data in batch in Postgres, autocommit must be set to false
        if (isBatch && Config.database == Config.Database.PSQL) dbConn.setAutoCommit(false);
        connections.put(key, dbConn);
        return dbConn;
    }

    public static void closeConnection(String dbName) throws SQLException {

        if (connections.containsKey(dbName)) {
            connections.get(dbName).close();
            connections.remove(dbName);
        }
        if (connections.containsKey(dbName + "_batch")) {
            connections.get(dbName + "_batch").close();
            connections.remove(dbName + "_batch");
        }
    }
}
