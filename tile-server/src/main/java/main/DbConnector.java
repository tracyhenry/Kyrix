package main;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import com.vertica.jdbc.*;

/**
 * Created by wenbo on 1/7/18.
 */
public class DbConnector {

    private static Map<String, Connection> connections = new HashMap<>();

    private static Statement getStmt(Connection conn) throws SQLException, ClassNotFoundException {

        // set autocommit
        if (Config.database == Config.Database.PSQL ||
                Config.database == Config.Database.VSQL){
            conn.setAutoCommit(false);
        }

        // get statement
        Statement retStmt = null;
        if (Config.database == Config.Database.PSQL ||
                Config.database == Config.Database.VSQL) {

            retStmt = conn.createStatement();

        } else if (Config.database == Config.Database.MYSQL) {

            retStmt = conn.createStatement(ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);
        }

        // set fetch size
        // NOTE: MySQL doesn't support fetch size very well. And MIN_VALUE isn't that bad.
        if (Config.database == Config.Database.MYSQL) {
            retStmt.setFetchSize(Integer.MIN_VALUE);
        } else {
            retStmt.setFetchSize(Config.iteratorfetchSize);
        }

        return retStmt;
    }


    private static Connection getDbConnByKey(String key, String dbServer, String dbName, String userName, String password)
            throws SQLException, ClassNotFoundException {

        if (connections.containsKey(key)) {
            return connections.get(key);
        }

        Connection dbConn = getDbConn(dbServer, dbName, userName, password);
        connections.put(key, dbConn);

        return dbConn;

    }

    private static Connection getDbConnByDbName(String dbServer, String dbName, String userName, String password)
            throws SQLException, ClassNotFoundException {

        if (connections.containsKey(dbName)) {
            return connections.get(dbName);
        }

        Connection dbConn = getDbConn(dbServer, dbName, userName, password);

        connections.put(dbName, dbConn);
        return dbConn;



    }

    private static Connection getDbConn(String dbServer, String dbName, String userName, String password)
            throws SQLException, ClassNotFoundException {

        Connection dbConn = null;
        if (Config.database == Config.Database.PSQL) {
            Class.forName("org.postgresql.Driver");
            dbConn = DriverManager.getConnection("jdbc:postgresql://" + dbServer +
                            "/" + dbName + "?sendStringParametersAsUnicode=false",
                    userName, password);
        } else if (Config.database == Config.Database.MYSQL) {
            Class.forName("com.mysql.jdbc.Driver");
            dbConn = DriverManager.getConnection("jdbc:mysql://" + dbServer +
                            "/" + dbName + "?sendStringParametersAsUnicode=false",
                    userName, password);
        } else if (Config.database == Config.Database.VSQL){

            Class.forName("com.vertica.jdbc.Driver");
            dbConn = DriverManager.getConnection("jdbc:vertica://" + dbServer +
                            "/" + dbName + "?sendStringParametersAsUnicode=false",
                    userName, password);

            ((VerticaConnection) dbConn).setProperty("ResultBufferSize", Config.vsqlBufferSize);
        }

        return dbConn;
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

    public static ResultSet getQueryResultIteratorByKey(String key, String dbName, String sql)
            throws SQLException, ClassNotFoundException {

        Statement stmt = DbConnector.getStmtByKey(key, dbName);
        return stmt.executeQuery(sql);

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

    public static Statement getStmtByDbName(String dbName) throws SQLException, ClassNotFoundException {

        // get connection
        Connection conn = getDbConnByDbName(Config.dbServer, dbName, Config.userName, Config.password);

        return getStmt(conn);

    }

    public static Statement getStmtByKey(String key, String dbName) throws SQLException, ClassNotFoundException {

        // get connection
        Connection conn = getDbConnByKey(key, Config.dbServer, dbName, Config.userName, Config.password);
        return getStmt(conn);

    }

    public static void commitConnection(String dbName) throws SQLException, ClassNotFoundException{

        // mysql uses autocommit
        if (Config.database == Config.Database.MYSQL){
            return;
        }

        Connection conn = getDbConnByDbName(Config.dbServer, dbName, Config.userName, Config.password);
        conn.commit();
    }

}

