package main;

import com.sun.net.httpserver.HttpServer;
import server.FirstRequestHandler;
import server.IndexHandler;
import server.TileRequestHandler;

import java.io.IOException;
import java.net.InetSocketAddress;

public class Main {

	public static void main(String[] args) throws IOException {
		HttpServer server = HttpServer.create(new InetSocketAddress(8000), 0);
		server.createContext("/", new IndexHandler());
		server.createContext("/first", new FirstRequestHandler());
		server.createContext("/tile", new TileRequestHandler());
		server.setExecutor(null); // creates a default executor
		server.start();
	}
}
