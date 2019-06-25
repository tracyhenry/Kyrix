package server;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import index.Indexer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.HashMap;
import java.util.Map;
import javax.net.ssl.HttpsURLConnection;
import main.Config;
import main.Main;

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
        Indexer.precompute();
        Main.setProjectClean();
        System.out.println("Completed recomputing indexes. Server restarting...");
        Server.startServer(Config.portNumber);
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
        sendResponse(httpExchange, responseCode, response.getBytes(), response.getBytes().length);
    }

    // https://stackoverflow.com/questions/11640025/how-to-obtain-the-query-string-in-a-get-with-java-httpserver-httpexchange
    public static Map<String, String> queryToMap(String query) {

        Map<String, String> result = new HashMap<>();
        // check if query is null
        if (query == null) return result;
        for (String param : query.split("&")) {
            int pos = param.indexOf("=");
            result.put(param.substring(0, pos), param.substring(pos + 1));
        }
        return result;
    }
}
