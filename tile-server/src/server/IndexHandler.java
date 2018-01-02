package server;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import javax.net.ssl.HttpsURLConnection;
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.io.OutputStream;

/**
 * Created by wenbo on 1/2/18.
 */
public class IndexHandler implements HttpHandler {
	@Override
	public void handle(HttpExchange httpExchange) throws IOException {

		// read the frontend file and return
		FileReader fr = new FileReader("../front-end/index.html");
		BufferedReader br = new BufferedReader(fr);
		StringBuilder content = new StringBuilder(1024);
		String s;
		while((s = br.readLine())!=null)
			content.append(s);
		byte[] byteContent = content.toString().getBytes();

		// send back a ok response
		httpExchange.sendResponseHeaders(HttpsURLConnection.HTTP_OK, byteContent.length);

		// write response
		OutputStream os = httpExchange.getResponseBody();
		os.write(byteContent);
		os.close();
	}
}
