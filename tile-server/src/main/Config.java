package main;

/**
 * Created by wenbo on 1/2/18.
 */
public class Config {

	// front-end file name
	public static String frontendFile = "../front-end/index.html";
	// config file name
	public static String configFileName = "./serverconfig.txt";

	// config file row numbers
	public static int projectNameRow = 0;
	public static int portNumberRow = 1;
	public static int dbServerRow = 2;
	public static int userNameRow = 3;
	public static int passwordRow = 4;

	// db name
	public static String databaseName = "Kyrix";

	// table name
	public static String projectTableName = "project";

	// project content column
	public static int contentColumn = 2;

	// tile size
	public static int tileW = 256, tileH = 256;
}
