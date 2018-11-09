package server;

import box.History;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import main.Config;

import javax.net.ssl.HttpsURLConnection;
import java.io.FileInputStream;
import java.io.IOException;

/**
 * Created by wenbo on 1/2/18.
 */
public class IndexHandler implements HttpHandler {

    @Override
    public void handle(HttpExchange httpExchange) throws IOException {

        System.out.println("Serving /");
        System.out.println(httpExchange.getRequestURI().getPath());

        // check if it is GET request
        if (! httpExchange.getRequestMethod().equalsIgnoreCase("GET")) {
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_BAD_METHOD, "");
            return;
        }

        String path = httpExchange.getRequestURI().getPath();
        if (path.equals("/")) {
            path = "/" + Config.indexFileName;
            // reset dynamic box history once every new session starts
            // (should be changed when doing multi-user)
            History.reset();
        }


        // read the frontend file and return
        FileInputStream fs = new FileInputStream(Config.webRoot + path);
        final byte[] content = new byte[0x1000000];
        int len = fs.read(content);

        // send back a ok response
        if (path.contains(".svg")) //todo: better file checking for the index handler
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, content, len, "image/svg+xml");
        else if (path.contains(".png"))
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, content, len, "image/png");
        else if (path.contains(".jpg"))
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, content, len, "image/jpg");
        else
            Server.sendResponse(httpExchange, HttpsURLConnection.HTTP_OK, content, len);
    }
}
