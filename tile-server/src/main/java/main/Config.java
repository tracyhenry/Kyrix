package main;

/**
 * Created by wenbo on 1/2/18.
 */
public class Config {

	// front-end root and file name
	public static String webRoot = "../front-end";
	public static String indexFileName = "index.html";

	// config file name
	public static String configFileName = "../config.txt";

	// config file row numbers
	public static int projectNameRow = 0;
	public static int portNumberRow = 1;
	public static int dbServerRow = 2;
	public static int userNameRow = 3;
	public static int passwordRow = 4;
	public static int d3DirRow = 5;
	public static int cacheSize = 10;

	// config varaibles, will be at runtime
	public static String projectName;
	public  static String dbServer;
	public static String userName;
	public static String password;
	public static int portNumber;
	public static String d3Dir;

	// db name
	public static String databaseName = "Kyrix";

	// table name
	public static String projectTableName = "project";

	// tile size
	public static int tileW = 1024, tileH = 1024;

	// number of worker threads
	public static int numThread = 4;

	// number of batch size when inserting bounding boxes records
	public static int bboxBatchSize = 10000;
}
