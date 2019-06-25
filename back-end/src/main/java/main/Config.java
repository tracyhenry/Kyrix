package main;

/** Created by wenbo on 1/2/18. */
public class Config {

    // front-end root and file name
    public static String webRoot = "../front-end";
    public static String indexFileName = "index.html";

    // config file name
    public static String configFileName = "../config.txt";

    // config file row numbers
    public static int projectNameRow = 0;
    public static int portNumberRow = 1;
    public static int dbRow = 2;
    public static int dbServerRow = 3;
    public static int userNameRow = 4;
    public static int passwordRow = 5;
    public static int kyrixDbNameRow = 6;
    public static int d3DirRow = 7;
    public static int cacheSize = 10;

    // config variables
    public static String dbServer;
    public static String userName;
    public static String password;
    public static int portNumber;
    public static String d3Dir;

    // db name
    public static String databaseName;

    // table name
    public static String projectTableName = "project";

    // tile size
    public static int tileW = 1024, tileH = 1024;

    // number of worker threads
    public static int numThread = 4;

    // number of batch size when inserting records
    public static int bboxBatchSize = 5000;
    public static int tileBatchSize = 10000;

    // tile indexing scheme
    public enum IndexingScheme {
        TILE_INDEX,
        POSTGIS_SPATIAL_INDEX,
        PSQL_NATIVEBOX_INDEX,
        PSQL_NATIVECUBE_INDEX,
        MYSQL_SPATIAL_INDEX
    };

    public static IndexingScheme indexingScheme = IndexingScheme.PSQL_NATIVEBOX_INDEX;

    // underlying database
    public enum Database {
        MYSQL,
        PSQL,
        CITUS
    };

    public static Database database;

    // database iterator fetch size
    public static int iteratorfetchSize = 1000;
}
