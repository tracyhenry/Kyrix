package server;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.FileInputStream;
import java.io.IOException;
import javax.net.ssl.HttpsURLConnection;
import main.Config;

/** Created by wenbo on 1/2/18. */
public class IndexHandler implements HttpHandler {

    @Override
    public void handle(HttpExchange httpExchange) throws IOException {

        System.out.println("Serving /");

        try {
            System.out.println(httpExchange.getRequestURI().getPath());

            // check if it is GET request
            if (!httpExchange.getRequestMethod().equalsIgnoreCase("GET")) {
                Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_METHOD, "");
                return;
            }

            String path = httpExchange.getRequestURI().getPath();
            if (path.contains("favicon.ico")) {
                Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_REQUEST, "");
                return;
            }
            if (path.equals("/")) path = "/" + Config.indexFileName;

            // read the frontend file and return
            FileInputStream fs = new FileInputStream(Config.webRoot + path);
            final byte[] content = new byte[0x1000000];
            int len = fs.read(content);

            // send back a ok response
            if (path.contains(".svg")) // todo: better file checking for the index handler
            Server.sendResponse(
                        httpExchange, HttpsURLConnection.HTTP_OK, content, len, "image/svg+xml");
            else if (path.contains(".png"))
                Server.sendResponse(
                        httpExchange, HttpsURLConnection.HTTP_OK, content, len, "image/png");
            else if (path.contains(".jpg"))
                Server.sendResponse(
                        httpExchange, HttpsURLConnection.HTTP_OK, content, len, "image/jpg");
            else if (path.contains(".js"))
                Server.sendResponse(
                        httpExchange,
                        HttpsURLConnection.HTTP_OK,
                        content,
                        len,
                        "application/javascript");
            else Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, content, len);
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("\n\n" + e.getMessage() + "\n");
            Server.printServingErrorMessage();
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_NO_CONTENT, "");
        }
    }
}
