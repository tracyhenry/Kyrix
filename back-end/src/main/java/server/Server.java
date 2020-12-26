package server;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import index.Indexer;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UnsupportedEncodingException;
import java.net.InetSocketAddress;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import javax.net.ssl.HttpsURLConnection;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;

/** Created by wenbo on 1/8/18. */
public class Server {

    private static HttpServer server;
    private static boolean terminated;
    private static Object terminationLock = new Object();

    public static void startServer(int portNumber) throws Exception {

        server = HttpServer.create(new InetSocketAddress(portNumber), 0);
        server.createContext("/", new IndexHandler());
        server.createContext("/first", new FirstRequestHandler());
        server.createContext("/tile", new TileRequestHandler());
        server.createContext("/dbox", new BoxRequestHandler());
        server.createContext("/canvas", new CanvasRequestHandler());
        server.createContext("/viewport", new ViewportRequestHandler());
        server.createContext("/project", new ProjectRequestHandler());
        server.setExecutor(
                null); // java.util.concurrent.Executors.newFixedThreadPool(Config.numThread));
        terminated = false;
        server.start();
        System.out.println("Backend server started...");
        if (Main.getProject() == null) System.out.println("Waiting for project definition...");
        synchronized (terminationLock) {
            while (!terminated) terminationLock.wait();
        }
        Server.stopServer();
        try {
            DbConnector.closeConnection(Config.databaseName);
            Indexer.precompute();
            saveBGRP();
            Main.setProjectClean();
            System.out.println("Completed recomputing indexes. Server restarting...");
        } catch (Exception e) {
            // print out stack trace
            e.printStackTrace();
            System.out.println("\n\n" + e.getMessage() + "\n");

            // clear project history and set current project to null
            ProjectRequestHandler.clearProjectHistory(Main.getProject().getName());
            Main.setProject(null);

            // print out indexing error message
            printIndexingErrorMessage();
        }
        Server.startServer(Config.portNumber);
    }

    public static void printIndexingErrorMessage() {

        // close db connections
        try {
            DbConnector.closeAllConnections();
        } catch (SQLException e) {
            e.printStackTrace();
        }

        // print error message
        System.out.println(
                "+---------------------------------------------------------+\n"
                        + "|ERROR!!! An exception occurred while indexing.           |\n"
                        + "|This is likely due to errors in database related things, |\n"
                        + "|e.g. a mis-formed SQL query in the specification, a non- |\n"
                        + "|existent column you specified, or the data isn't loaded  |\n"
                        + "|into the database.                                       |\n"
                        + "|                                                         |\n"
                        + "|Indexing is now terminated and the server is restarted.  |\n"
                        + "|Please inspect your spec and database, and then recompile|\n"
                        + "|the project.If you can't figure out the issue, feel free |\n"
                        + "|to contact Kyrix maintainers on Gitter:                  |\n"
                        + "|                                                         |\n"
                        + "|https://gitter.im/kyrix-mit/kyrix                        |\n"
                        + "+---------------------------------------------------------+\n"
                        + "Server restarting....");
    }

    public static void printServingErrorMessage() {

        // close db connections
        try {
            DbConnector.closeAllConnections();
        } catch (SQLException e) {
            e.printStackTrace();
        }

        // print error message
        System.out.println(
                "+-------------------------------------------------------------+\n"
                        + "|ERROR!!! An exception occurred while serving an HTTP request.|\n"
                        + "|This is likely due to errors in database related things,     |\n"
                        + "|e.g. a non-existent column you specified, or deleted/-       |\n"
                        + "|corrupted database indexes.                                  |\n"
                        + "|                                                             |\n"
                        + "|The server will continue running, but the error will likely  |\n"
                        + "|occur again. You can recompile the project to recompute the  |\n"
                        + "|indexes, or reach out to the kyrix maintainers for help.     |\n"
                        + "|                                                             |\n"
                        + "|Chat on Gitter: https://gitter.im/kyrix-mit/kyrix            |\n"
                        + "+-------------------------------------------------------------+\n"
                        + "Server restarting...");
    }

    public static boolean checkPredicates(ArrayList<String> predicates, Canvas c)
            throws SQLException, ClassNotFoundException {
        boolean allValid = true;
        for (int i = 0; i < predicates.size(); i++) {
            String predicate = predicates.get(i);
            if (predicate.isEmpty()) continue;
            ArrayList<String> colNames =
                    c.getLayers().get(i).getTransform().getFilterableColumnNames();
            if (!checkPredicate(predicate, colNames)) {
                System.out.println(predicate);
                System.out.println(colNames);
                allValid = false;
                break;
            }
        }
        return allValid;
    }

    // save BGPR of the old project to the database
    private static void saveBGRP() throws SQLException, ClassNotFoundException {

        if (Main.getProject() == null) return;

        // create the bgrp table if not exists
        String sql = "CREATE TABLE IF NOT EXISTS bgrp(project_id text, gson text);";
        System.out.println(sql);
        Statement kyrixStmt = DbConnector.getStmtByDbName(Config.databaseName);
        kyrixStmt.execute(sql);

        // delete the entry if exists
        sql = "DELETE FROM bgrp WHERE project_id = '" + Main.getProject().getName() + "';";
        System.out.println(sql);
        kyrixStmt.execute(sql);

        Gson gson = new GsonBuilder().create();
        String jsonText = gson.toJson(Main.getProject().getBGRP());
        sql =
                "INSERT INTO bgrp VALUES ('"
                        + Main.getProject().getName()
                        + "', '"
                        + jsonText
                        + "');";
        System.out.println(sql);
        System.out.println("-------");
        kyrixStmt.execute(sql);

        // close statement
        kyrixStmt.close();
    }

    private static boolean checkPredicate(String predicate, ArrayList<String> colNames) {

        int len = predicate.length();

        // length must be >= 2
        // the boundary of the recursion should be colName='XXX'
        if (len < 2) return false;
        if (predicate.charAt(0) != '(' || predicate.charAt(len - 1) != ')') return false;

        // find AND or OR
        int sumParenthesis = 0;
        int pos = -1;
        String operator = "";
        for (int i = 1; i < len - 1; i++) {
            if (predicate.charAt(i) == '(') sumParenthesis++;
            if (predicate.charAt(i) == ')') sumParenthesis--;
            if (sumParenthesis == 0) {
                if (i + 5 < len && predicate.substring(i, i + 5).equals(" AND ")) {
                    pos = i;
                    operator = "AND";
                } else if (i + 4 < len && predicate.substring(i, i + 4).equals(" OR ")) {
                    pos = i;
                    operator = "OR";
                } else if (predicate.charAt(i) == '=') {
                    pos = i;
                    operator = "=";
                }
            }
        }
        if (pos == -1) return false;
        if (operator == "AND") {
            String l = predicate.substring(1, pos);
            String r = predicate.substring(pos + 5, len - 1);
            return checkPredicate(l, colNames) && checkPredicate(r, colNames);
        } else if (operator == "OR") {
            String l = predicate.substring(1, pos);
            String r = predicate.substring(pos + 4, len - 1);
            return checkPredicate(l, colNames) && checkPredicate(r, colNames);
        } else if (operator == "=") {
            String l = predicate.substring(1, pos);
            String r = predicate.substring(pos + 1, len - 1);
            // l must be a column
            boolean isAColumn = false;
            for (String colName : colNames)
                if (colName.toLowerCase().equals(l.toLowerCase())) isAColumn = true;
            if (!isAColumn) return false;
            // r must begin and end with a single quote
            if (r.length() < 2) return false;
            if (r.charAt(0) != '\'' || r.charAt(r.length() - 1) != '\'') return false;
            return true;
        }

        return false;
    }

    public static void terminate() {

        terminated = true;
        synchronized (terminationLock) {
            terminationLock.notify();
        }
    }

    public static void stopServer() {

        if (server != null) server.stop(0);
        server = null;
    }

    public static void sendResponse(
            HttpExchange httpExchange, int responseCode, byte[] response, int len)
            throws IOException {

        // write response
        httpExchange.sendResponseHeaders(responseCode, len);
        OutputStream os = httpExchange.getResponseBody();
        os.write(response, 0, len);
        os.close();
        httpExchange.close();
    }

    // send response with additional contentType information
    public static void sendResponse(
            HttpExchange httpExchange,
            int responseCode,
            byte[] response,
            int len,
            String contentType)
            throws IOException {

        // add content type to response header
        httpExchange.getResponseHeaders().add("Content-Type", contentType);
        sendResponse(httpExchange, responseCode, response, len);
    }

    // send response using string
    public static void sendResponse(HttpExchange httpExchange, int responseCode, String response)
            throws IOException {

        // https://stackoverflow.com/questions/35313180/cors-with-com-sun-net-httpserver
        httpExchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        if (httpExchange.getRequestMethod().equalsIgnoreCase("OPTIONS")) {
            httpExchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, OPTIONS");
            httpExchange
                    .getResponseHeaders()
                    .add("Access-Control-Allow-Headers", "Content-Type,Authorization");
            httpExchange.sendResponseHeaders(HttpsURLConnection.HTTP_NO_CONTENT, -1);
            return;
        }
        httpExchange.getResponseHeaders().add("Content-Type", "text/plain");
        sendResponse(httpExchange, responseCode, response.getBytes(), response.getBytes().length);
    }

    // https://stackoverflow.com/questions/11640025/how-to-obtain-the-query-string-in-a-get-with-java-httpserver-httpexchange
    public static Map<String, String> queryToMap(String query) throws UnsupportedEncodingException {

        Map<String, String> result = new HashMap<>();
        // check if query is null
        if (query == null) return result;
        for (String param : query.split("&")) {
            param = java.net.URLDecoder.decode(param, "UTF-8");
            int pos = param.indexOf("=");
            result.put(param.substring(0, pos), param.substring(pos + 1));
        }

        return result;
    }

    public static void sendStats(
            String projectName,
            String canvasId,
            String queryType,
            double fetchTime,
            int fetchedRows) {
        String sql =
                "insert into stats (project_name, canvas_id, query_type, fetch_time_ms, rows_fetched) values ("
                        + "'"
                        + projectName
                        + "','"
                        + canvasId
                        + "','"
                        + queryType
                        + "',"
                        + fetchTime
                        + ","
                        + fetchedRows
                        + ");";
        System.out.println("stats sql: " + sql);
        System.out.println("database name is: " + Config.databaseName);

        try {
            DbConnector.executeUpdate(Config.databaseName, sql);
        } catch (Exception e) {
            System.out.println("couldn't write stats to the stats table: ");
            System.out.println(e);
        }
    }
}
