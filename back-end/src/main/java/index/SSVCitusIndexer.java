package index;

import box.Box;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import index.util.KDTree;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.*;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.SSV;

/** Created by wenbo on 11/1/19. */
public class SSVCitusIndexer extends BoundingBoxIndexer {

    public class SSVInfo {
        public ArrayList<String> columnNames;
        public ArrayList<String> tableNames;
        public double zoomFactor;
        public int bboxW, bboxH;
        public ArrayList<Integer> citusHashKeys;
        public ArrayList<KDTree> kdTreeNodes;
    }

    private static SSVCitusIndexer instance = null;
    private final Gson gson;
    private final int L = 6;
    private final int objectNumLimit = 4000; // in a 1k by 1k region
    private final int virtualViewportSize = 1000;
    private final int numPartitions = 4;
    private final int binarySearchMaxLoop = 40;
    private final double bottomScale = 1e10;
    private final int reshuffleBatchCt = 16;
    private final String aggKeyDelimiter = "__";
    private SSV ssv;
    private Statement kyrixStmt;
    private KDTree root = null;
    private Queue<KDTree> q = null;
    private double theta = 1.0;
    private double loX, loY, hiX, hiY;
    private String rawTable, sql, xCol, yCol;
    private String curSSVId; // ssvIndex + "_0"
    private int curSSVIndex, numLevels, numRawColumns;
    private int topLevelWidth, topLevelHeight, bboxW, bboxH;
    private long st, st1, numRawRows;
    private ArrayList<Integer> citusHashKeys;
    private ArrayList<String> citusNodeIPs, citusNodePorts;
    private ArrayList<ArrayList<String>> citusShardIds;
    private ArrayList<String> columnNames, columnTypes, zoomLevelTables;

    // singleton pattern to ensure only one instance existed
    private SSVCitusIndexer() {
        gson = new GsonBuilder().create();
    }

    // thread-safe instance getter
    public static synchronized SSVCitusIndexer getInstance() {

        if (instance == null) instance = new SSVCitusIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        // create MV for all ssv layers at once
        curSSVId = c.getLayers().get(layerId).getSSVId();
        if (!curSSVId.substring(curSSVId.indexOf("_") + 1).equals("0")) return;

        // set some commonly accessed variables, such as ssv, numLevels, numRawColumns, etc.
        setCommonVariables();

        // step 1: spatial partitioning
        performSpatialPartitioning();

        // step 2: bottom-up clustering
        bottomUpClustering();

        // save useful info to the database for online querying
        saveSSVInfo();
    }

    private void performSpatialPartitioning() throws SQLException, ClassNotFoundException {
        // augment raw table with centroid_point, sp_hash_key and spatial index on centroid
        augmentRawTable();

        // create a KD tree using spatial queries
        buildKDTree();

        // create all bbox tables;
        createBBoxTables();

        // generating citus hash keys
        generateCitusHashKeys();

        // populating a fake bottom level table, using a UDF to generate hash keys
        populateFakeBottomLevelTable();

        // remove extra columns from rawTable
        cleanUpRawTable();
    }

    private void bottomUpClustering() throws SQLException, ClassNotFoundException {
        // create the PLV8 function for single-node clustering
        createSingleNodeClusteringUDF();

        // create the PLV8 function
        createMergeSplitUDF();

        // bottom up clustering
        for (int i = numLevels - 1; i > L; i--) {
            // running single node clustering in parallel
            runSingleNodeClusteringUDFInParallel(i);

            // build spatial indexes
            buildSpatialIndexOnLevel(i);

            // get count along boundaries
            st1 = System.nanoTime();
            mergeClustersAlongSplits(root, i);
            System.out.println("************************************************");
            System.out.println("Merge splits took: " + (System.nanoTime() - st1) / 1e9 + "s.");
            System.out.println("************************************************");
        }

        for (int i = L; i >= 0; i--) {
            // apply single node clustering on
            // all data from level i + 1
            runSingleNodeClusteringUDF(i);

            // build spatial indexes
            buildSpatialIndexOnLevel(i);
        }
    }

    private void setCommonVariables() throws Exception {
        System.out.println("Setting common variables...");

        // get current SSV object
        curSSVIndex = Integer.valueOf(curSSVId.substring(0, curSSVId.indexOf("_")));
        ssv = Main.getProject().getSsvs().get(curSSVIndex);

        // number of levels
        numLevels = ssv.getNumLevels();
        System.out.println("numLevels = " + numLevels);

        // raw fields
        st = System.nanoTime();
        ArrayList<String> columnNamesFromSSV = ssv.getColumnNames();
        ArrayList<String> columnTypesFromSSV = ssv.getColumnTypes();
        columnNames = new ArrayList<>();
        columnTypes = new ArrayList<>();
        for (int i = 0; i < columnNamesFromSSV.size(); i++)
            if (!columnNamesFromSSV.get(i).equals("hash_key")) {
                columnNames.add(columnNamesFromSSV.get(i));
                columnTypes.add(columnTypesFromSSV.get(i));
            }
        numRawColumns = columnNames.size();
        System.out.println("numRawColumns = " + numRawColumns);
        System.out.println("Raw columns: ");
        for (int i = 0; i < numRawColumns; i++)
            System.out.print(columnNames.get(i) + " " + columnTypes.get(i) + " ");
        System.out.println();
        System.out.println(
                "Getting # of raw columns took: " + (System.nanoTime() - st) / 1e9 + "s.");

        // raw table
        rawTable = ssv.getRawTable();
        System.out.println("rawTable = " + rawTable);

        // calculate overlapping threshold
        theta =
                Math.max(
                        0.2,
                        Math.sqrt(
                                4
                                        * (virtualViewportSize + ssv.getBboxW() * 2)
                                        * (virtualViewportSize + ssv.getBboxH() * 2)
                                        / objectNumLimit
                                        / ssv.getBboxH()
                                        / ssv.getBboxW()));
        theta = Math.max(theta, ssv.getOverlap());
        System.out.println("theta = " + theta);

        // DB statement
        kyrixStmt = DbConnector.getStmtByDbName(Config.databaseName);

        // toplevel size
        topLevelWidth = ssv.getTopLevelWidth();
        topLevelHeight = ssv.getTopLevelHeight();
        System.out.println("topLevelWidth = " + topLevelWidth);
        System.out.println("topLevelHeight = " + topLevelHeight);

        // raw XY extent
        ssv.setXYExtent();
        loX = ssv.getLoX();
        loY = ssv.getLoY();
        hiX = ssv.getHiX();
        hiY = ssv.getHiY();
        System.out.println("[loX, hiX] = [" + loX + ", " + hiX + "]");
        System.out.println("[loY, hiY] = [" + loY + ", " + hiY + "]");

        // xCol, yCol
        xCol = ssv.getxCol();
        yCol = ssv.getyCol();
        System.out.println("xCol = " + xCol);
        System.out.println("yCol = " + yCol);

        // bboxW, bboxH
        bboxW = ssv.getBboxW();
        bboxH = ssv.getBboxH();

        // zoom level table names
        // TODO: add project name and ssvIds
        zoomLevelTables = new ArrayList<>();
        for (int i = 0; i < numLevels; i++) zoomLevelTables.add("l" + i);
        zoomLevelTables.add("bottom_level");

        // citus hash key hashmap
        citusHashKeys = new ArrayList<>();

        // calculate numRaw columns
        sql = "SELECT count(*) FROM " + rawTable + ";";
        System.out.println(sql);
        st = System.nanoTime();
        numRawRows = Long.valueOf(DbConnector.getQueryResult(kyrixStmt, sql).get(0).get(0));
        System.out.println(
                "Running count(*) on "
                        + rawTable
                        + " took: "
                        + (System.nanoTime() - st) / 1e9
                        + "s.");
        System.out.println("numRawRows = " + numRawRows);
    }

    private void augmentRawTable() throws SQLException {
        System.out.println("Augmenting raw data table...");

        // add columns
        sql = "ALTER TABLE " + rawTable + " ADD COLUMN IF NOT EXISTS cx real;";
        System.out.println(sql);
        kyrixStmt.executeUpdate(sql);
        sql = "ALTER TABLE " + rawTable + " ADD COLUMN IF NOT EXISTS cy real;";
        System.out.println(sql);
        kyrixStmt.executeUpdate(sql);
        sql = "ALTER TABLE " + rawTable + " ADD COLUMN IF NOT EXISTS centroid point;";
        System.out.println(sql);
        kyrixStmt.executeUpdate(sql);

        // update cx, cy
        sql =
                "UPDATE "
                        + rawTable
                        + " SET cx = ("
                        + (topLevelWidth - bboxW)
                        + " * ("
                        + xCol
                        + " - "
                        + loX
                        + ") / "
                        + (hiX - loX)
                        + " + "
                        + (bboxW / 2.0)
                        + ") * "
                        + bottomScale
                        + ", cy = ("
                        + (topLevelHeight - bboxH)
                        + " * ("
                        + yCol
                        + " - "
                        + loY
                        + ") / "
                        + (hiY - loY)
                        + " + "
                        + (bboxH / 2.0)
                        + ") * "
                        + bottomScale
                        + ";";
        System.out.println(sql);
        st = System.nanoTime();
        kyrixStmt.executeUpdate(sql);
        System.out.println(
                "Populating cx, cy column on "
                        + rawTable
                        + " took: "
                        + (System.nanoTime() - st) / 1e9
                        + "s.");

        // update centroid
        sql = "UPDATE " + rawTable + " SET centroid = point(cx, cy);";
        System.out.println(sql);
        st = System.nanoTime();
        kyrixStmt.executeUpdate(sql);
        System.out.println(
                "Populating centroid column on "
                        + rawTable
                        + " took: "
                        + (System.nanoTime() - st) / 1e9
                        + "s.");

        // create gist index on centroid. No CLUSTER here for now (the performance was ok w/o
        // CLUSTER)
        sql = "DROP INDEX IF EXISTS rawtable_centroid_gist;";
        System.out.println(sql);
        st = System.nanoTime();
        kyrixStmt.executeUpdate(sql);
        System.out.println(
                "Drop existing index on centroid took: " + (System.nanoTime() - st) / 1e9 + "s.");

        sql = "CREATE INDEX rawtable_centroid_gist ON " + rawTable + " USING gist(centroid);";
        System.out.println(sql);
        st = System.nanoTime();
        kyrixStmt.executeUpdate(sql);
        System.out.println(
                "Creating gist index on centroid took: " + (System.nanoTime() - st) / 1e9 + "s.");
    }

    private void buildKDTree() throws SQLException, ClassNotFoundException {
        System.out.println("Building KD tree...");

        // initialize root note
        double minx = bboxW / 2.0 * bottomScale;
        double miny = bboxH / 2.0 * bottomScale;
        double maxx = (topLevelWidth - bboxW / 2.0) * bottomScale;
        double maxy = (topLevelHeight - bboxH / 2.0) * bottomScale;
        System.out.println("KDTree root: " + minx + ", " + miny + ", " + maxx + ", " + maxy);
        sql =
                "SELECT count(*) FROM "
                        + rawTable
                        + " WHERE centroid <@ box('"
                        + minx
                        + ", "
                        + miny
                        + ", "
                        + maxx
                        + ", "
                        + maxy
                        + "');";
        System.out.println(sql);
        st = System.nanoTime();
        long rootCount = Long.valueOf(DbConnector.getQueryResult(kyrixStmt, sql).get(0).get(0));
        System.out.println("Root count: " + rootCount);
        root = new KDTree(minx, miny, maxx, maxy, KDTree.SplitDir.VERTICAL, rootCount);
        System.out.println("Getting root count took: " + (System.nanoTime() - st) / 1e9 + "s.");

        // use a queue to expand the KD-tree
        st = System.nanoTime();
        q = new LinkedList<>();
        q.add(root);
        while (q.size() < numPartitions) {
            KDTree curNode = q.remove();
            // trying to split curNode into 2, using spatial queries
            double lo, hi, mid = 0;
            long halfCount = 0;
            if (curNode.splitDir.equals(KDTree.SplitDir.HORIZONTAL)) {
                lo = curNode.miny;
                hi = curNode.maxy;
            } else {
                lo = curNode.minx;
                hi = curNode.maxx;
            }
            // binar search
            st1 = System.nanoTime();
            for (int lp = 0; lp <= binarySearchMaxLoop; lp++) {
                mid = (lo + hi) / 2;
                // construct spatial query to fetch counts
                sql = "SELECT COUNT(*) FROM " + rawTable + " WHERE centroid <@ box('";
                if (curNode.splitDir.equals(KDTree.SplitDir.HORIZONTAL))
                    sql +=
                            curNode.minx
                                    + ", "
                                    + mid
                                    + ", "
                                    + curNode.maxx
                                    + ", "
                                    + curNode.miny
                                    + "');";
                else
                    sql +=
                            curNode.minx
                                    + ", "
                                    + curNode.maxy
                                    + ", "
                                    + mid
                                    + ", "
                                    + curNode.miny
                                    + "');";
                halfCount = Long.valueOf(DbConnector.getQueryResult(kyrixStmt, sql).get(0).get(0));
                if (Math.abs(halfCount - Double.valueOf(curNode.count) / 2.0) / curNode.count
                        <= 0.01) break;
                if (halfCount < curNode.count - halfCount) lo = mid;
                else hi = mid;
            }
            curNode.splitPoint = mid;
            System.out.println("Current KD-tree node being split: " + curNode);
            System.out.println("Binary search took: " + (System.nanoTime() - st1) / 1e9 + "s.");

            // set split point && construct left child and right child
            /*            if (curNode.splitDir.equals(KDTree.SplitDir.HORIZONTAL)) {
                curNode.lc =
                        new KDTree(
                                curNode.minx,
                                curNode.miny,
                                curNode.maxx,
                                mid,
                                KDTree.SplitDir.VERTICAL,
                                halfCount);
                curNode.rc =
                        new KDTree(
                                curNode.minx,
                                mid,
                                curNode.maxx,
                                curNode.maxy,
                                KDTree.SplitDir.VERTICAL,
                                curNode.count - halfCount);
            } else {
                curNode.lc =
                        new KDTree(
                                curNode.minx,
                                curNode.miny,
                                mid,
                                curNode.maxy,
                                KDTree.SplitDir.HORIZONTAL,
                                halfCount);
                curNode.rc =
                        new KDTree(
                                mid,
                                curNode.miny,
                                curNode.maxx,
                                curNode.maxy,
                                KDTree.SplitDir.HORIZONTAL,
                                curNode.count - halfCount);
            }*/

            curNode.lc =
                    new KDTree(
                            curNode.minx,
                            curNode.miny,
                            mid,
                            curNode.maxy,
                            KDTree.SplitDir.VERTICAL,
                            halfCount);
            curNode.rc =
                    new KDTree(
                            mid,
                            curNode.miny,
                            curNode.maxx,
                            curNode.maxy,
                            KDTree.SplitDir.VERTICAL,
                            curNode.count - halfCount);

            // push left right children into the queue
            q.add(curNode.lc);
            q.add(curNode.rc);
        }

        System.out.println("\n************************************************");
        System.out.println("Building KD-tree took: " + (System.nanoTime() - st) / 1e9 + "s.");
        System.out.println("************************************************\n");

        // print out counts
        for (KDTree node : q) System.out.print(node.count + " ");
        System.out.println();
    }

    private void createBBoxTables() throws SQLException, ClassNotFoundException {
        System.out.println("Creating bbox tables for all levels...");

        // create tables
        for (int i = numLevels; i >= 0; i--) {
            String tableName = zoomLevelTables.get(i);

            // drop table if exists
            sql = "DROP TABLE IF EXISTS " + tableName;
            System.out.println(sql);
            kyrixStmt.executeUpdate(sql);

            // create table
            sql = "CREATE UNLOGGED TABLE " + tableName + "(";
            for (int j = 0; j < numRawColumns; j++)
                sql += columnNames.get(j) + " " + columnTypes.get(j) + ", ";
            sql +=
                    "hash_key int, cluster_agg text, cx real, cy real, minx real, miny real, maxx real, maxy real, centroid point);";
            System.out.println(sql);
            kyrixStmt.executeUpdate(sql);

            // make it distributed
            if (i > L) {
                sql =
                        "SELECT create_distributed_table('"
                                + zoomLevelTables.get(i)
                                + "', 'hash_key'";
                if (i < numLevels)
                    sql += ", colocate_with => '" + zoomLevelTables.get(numLevels) + "'";
                sql += ");";
                System.out.println(sql);
                kyrixStmt.executeQuery(sql);
            }
        }
    }

    private void generateCitusHashKeys() throws SQLException, ClassNotFoundException {
        System.out.println("Generating citus hash keys...");

        // generate numPartition hash_keys so that none of them
        // are in the same shard for the fake bottom level table
        // (and therefore none of them are in the same shard for all tables
        // because tables are all colocated and use the same hash function)
        citusHashKeys = new ArrayList<>();
        citusShardIds = new ArrayList<>();
        for (int i = 0; i <= numLevels; i++) citusShardIds.add(new ArrayList<>());
        HashMap<String, Integer> bottomLevelShardIdMap = new HashMap<>();
        for (int key = 0; ; key++) {
            sql =
                    "SELECT get_shard_id_for_distribution_column('"
                            + zoomLevelTables.get(numLevels)
                            + "',"
                            + key
                            + ");";
            String shardId = DbConnector.getQueryResult(kyrixStmt, sql).get(0).get(0);
            if (bottomLevelShardIdMap.containsKey(shardId)) continue;
            bottomLevelShardIdMap.put(shardId, citusHashKeys.size());
            citusHashKeys.add(key);
            for (int i = L + 1; i <= numLevels; i++) {
                sql =
                        "SELECT get_shard_id_for_distribution_column('"
                                + zoomLevelTables.get(i)
                                + "',"
                                + key
                                + ");";
                shardId = DbConnector.getQueryResult(kyrixStmt, sql).get(0).get(0);
                citusShardIds.get(i).add(shardId);
            }
            if (citusHashKeys.size() >= numPartitions) break;
        }

        // check collision
        System.out.println();
        for (int i = L + 1; i <= numLevels; i++)
            for (int x = 0; x < numPartitions; x++)
                for (int y = x + 1; y < numPartitions; y++)
                    if (citusShardIds.get(i).get(x).equals(citusShardIds.get(i).get(y)))
                        System.out.println(
                                "Shard ID collision!!!!!! Level "
                                        + i
                                        + ":\n"
                                        + " partition "
                                        + x
                                        + " (key = "
                                        + citusHashKeys.get(x)
                                        + " ) and"
                                        + " partition "
                                        + y
                                        + " (key = "
                                        + citusHashKeys.get(y)
                                        + ")");

        // getting the node names and ports
        sql =
                "SELECT shardid, nodename, nodeport "
                        + "FROM pg_dist_node, pg_dist_placement "
                        + "WHERE pg_dist_node.groupid = pg_dist_placement.groupid;";
        System.out.println(sql);
        st = System.nanoTime();
        ArrayList<ArrayList<String>> res = DbConnector.getQueryResult(kyrixStmt, sql);
        citusNodeIPs = new ArrayList<>(Collections.nCopies(numPartitions, ""));
        citusNodePorts = new ArrayList<>(Collections.nCopies(numPartitions, ""));
        for (int i = 0; i < res.size(); i++) {
            String shardId = res.get(i).get(0);
            if (!bottomLevelShardIdMap.containsKey(shardId)) continue;
            int partitionId = bottomLevelShardIdMap.get(shardId);
            String nodeIP = res.get(i).get(1);
            String nodePort = res.get(i).get(2);
            citusNodeIPs.set(partitionId, nodeIP);
            citusNodePorts.set(partitionId, nodePort);
        }

        System.out.println("=============== now printing out partitions ===============");
        int ct = 0;
        for (KDTree o : q) {
            System.out.print("Hash key: " + citusHashKeys.get(ct) + ", ");
            System.out.print(
                    "Bottom level shard ID: " + citusShardIds.get(numLevels).get(ct) + ", ");
            System.out.print(
                    "ip = " + citusNodeIPs.get(ct) + ", port = " + citusNodePorts.get(ct) + ", ");
            System.out.print("minx = " + o.minx + ", miny = " + o.miny + ", ");
            System.out.print("maxx = " + o.maxx + ", maxy = " + o.maxy + ", ");
            System.out.println(" expected count = " + o.count);
            ct++;
        }
    }

    private void populateFakeBottomLevelTable() throws SQLException {
        System.out.println("Creating fake bottom level table...");

        // create a UDF generate spatial hash_id
        String funcSql =
                "CREATE OR REPLACE FUNCTION get_citus_spatial_hash_key("
                        + "cx real, cy real)"
                        + " returns int AS $$ ";
        String partitionStr = "[";
        Queue<KDTree> qq = new LinkedList<>();
        qq.add(root);
        while (qq.size() > 0) {
            KDTree o = qq.remove();
            if (partitionStr.charAt(partitionStr.length() - 1) != '[') partitionStr += ",";
            partitionStr += "[" + o.minx + "," + o.miny + ", " + o.maxx + ", " + o.maxy + "]";
            if (o.lc != null) qq.add(o.lc);
            if (o.rc != null) qq.add(o.rc);
        }
        partitionStr += "]";
        String hashKeysStr = "[";
        for (int i = 0; i < citusHashKeys.size(); i++)
            hashKeysStr += (i > 0 ? "," : "") + citusHashKeys.get(i);
        hashKeysStr += "]";
        funcSql +=
                ssv.getGetCitusSpatialHashKeyBody()
                        .replaceAll("REPLACE_ME_partitions", partitionStr)
                        .replaceAll("REPLACE_ME_hashkeys", hashKeysStr);
        funcSql += " $$ LANGUAGE plv8";
        sql = funcSql + " STABLE;";
        System.out.println("Creating get_citus_spatial_hash_key on master:\n" + sql);
        kyrixStmt.executeUpdate(sql);

        sql = "SELECT run_command_on_workers($cmd$ " + funcSql + " $cmd$);";
        System.out.println("CREATING get_citus_spatial_hash_key on workers:\n" + sql);
        kyrixStmt.executeQuery(sql);

        // big INSERT INTO bottom_level SELECT * FROM rawTable
        // have to insert by batch here by hash modulo because Citus
        // fetches everything into the memory of coordinator (ouch!)
        // also, need to make sure hash_keys are non-negative
        st = System.nanoTime();
        for (int m = 0; m < reshuffleBatchCt; m++) {
            sql = "INSERT INTO " + zoomLevelTables.get(numLevels) + "(";
            for (int i = 0; i < numRawColumns; i++) sql += columnNames.get(i) + ", ";
            sql += "hash_key, cluster_agg, cx, cy) SELECT ";
            for (int i = 0; i < numRawColumns; i++) sql += columnNames.get(i) + ", ";
            sql +=
                    "get_citus_spatial_hash_key(cx, cy), '{\"count(*)\":1}', cx, cy FROM "
                            + rawTable
                            + " WHERE mod(hash_key, "
                            + reshuffleBatchCt
                            + ") = "
                            + m
                            + ";";
            System.out.println(sql);
            st1 = System.nanoTime();
            kyrixStmt.executeUpdate(sql);
            System.out.println("Batch " + m + " took: " + (System.nanoTime() - st1) / 1e9 + "s.");
        }
        System.out.println("\n************************************************");
        System.out.println(
                "Populating "
                        + zoomLevelTables.get(numLevels)
                        + " took: "
                        + (System.nanoTime() - st) / 1e9
                        + "s.");
        System.out.println("************************************************\n");
    }

    private void cleanUpRawTable() throws SQLException {
        // drop columns
        sql = "ALTER TABLE " + rawTable + " DROP COLUMN IF EXISTS cx;";
        System.out.println(sql);
        kyrixStmt.executeUpdate(sql);
        sql = "ALTER TABLE " + rawTable + " DROP COLUMN IF EXISTS cy;";
        System.out.println(sql);
        kyrixStmt.executeUpdate(sql);
        sql = "ALTER TABLE " + rawTable + " DROP COLUMN IF EXISTS centroid;";
        System.out.println(sql);
        kyrixStmt.executeUpdate(sql);
    }

    private void createSingleNodeClusteringUDF() throws SQLException {
        System.out.println("Creating the PLV8 UDF for single node clustering algo...");
        String funcSql =
                "CREATE OR REPLACE FUNCTION single_node_clustering_algo("
                        + "shard text, ssv jsonb) returns int AS $$ "
                        + ssv.getSingleNodeClusteringBody()
                                .replaceAll(
                                        "REPLACE_ME_merge_cluster_aggs", ssv.getMergeClusterAggs())
                        + "$$ LANGUAGE plv8";
        sql = funcSql + " STABLE;";
        System.out.println("Creating single_node_clustering_algo on master:\n" + sql);
        kyrixStmt.executeUpdate(sql);

        sql = "SELECT run_command_on_workers($cmd$ " + funcSql + " $cmd$);";
        System.out.println("Creating single_node_clustering_algo on workers:\n" + sql);
        kyrixStmt.executeQuery(sql);
    }

    private void createMergeSplitUDF() throws SQLException {
        System.out.println("Creating the PLV8 UDF for merging clusters along splits...");

        sql =
                "CREATE OR REPLACE FUNCTION merge_clusters_along_splits("
                        + "clusters jsonb[], ssv jsonb) returns setof jsonb AS $$ "
                        + ssv.getMergeClustersAlongSplitsBody()
                                .replaceAll(
                                        "REPLACE_ME_merge_cluster_aggs", ssv.getMergeClusterAggs())
                        + "$$ LANGUAGE plv8";
        sql = sql + " STABLE;";
        System.out.println("Creating merge_clusters_along_splits on master:\n" + sql);
        kyrixStmt.executeUpdate(sql);
    }

    private String getSSVJsonStr(double zoomFactor, boolean columnList, boolean aggFields) {
        String ret = "";
        ret =
                "\"xCol\":\""
                        + ssv.getxCol()
                        + "\", \"yCol\":\""
                        + ssv.getyCol()
                        + "\", \"zCol\":\""
                        + ssv.getzCol()
                        + "\", \"zOrder\":\""
                        + ssv.getzOrder()
                        + "\", \"zoomFactor\":"
                        + zoomFactor
                        + ", \"theta\":"
                        + theta
                        + ", \"aggKeyDelimiter\": \""
                        + aggKeyDelimiter
                        + "\", \"bboxW\":"
                        + bboxW
                        + ", \"bboxH\":"
                        + bboxH
                        + ", \"topk\":"
                        + ssv.getTopk();
        if (columnList) {
            ret += ", \"fields\":[";
            // field names
            for (int j = 0; j < numRawColumns; j++) ret += "\"" + columnNames.get(j) + "\", ";
            ret += "\"hash_key\", \"cluster_agg\", \"cx\", \"cy\"]";
            // field types
            ret += ", \"types\":[";
            for (int j = 0; j < numRawColumns; j++) ret += "\"" + columnTypes.get(j) + "\", ";
            ret += "\"int\", \"text\", \"real\", \"real\"]";
        }
        if (aggFields) {
            ret += ", \"aggDimensionFields\": [";
            for (int j = 0; j < ssv.getAggDimensionFields().size(); j++)
                ret += (j > 0 ? ", \"" : "\"") + ssv.getAggDimensionFields().get(j) + "\"";
            ret += "], \"aggMeasureFields\": [";
            for (int j = 0; j < ssv.getAggMeasureFields().size(); j++)
                ret += (j > 0 ? ", \"" : "\"") + ssv.getAggMeasureFields().get(j) + "\"";
            ret += "]";
        }

        return ret;
    }

    private void runSingleNodeClusteringUDF(int i) throws SQLException {
        System.out.println(
                "Applying single_node_clustering_algo directly on master"
                        + " on clusters in level "
                        + (i + 1)
                        + " for level"
                        + i
                        + "...");

        double zoomFactor = ssv.getZoomFactor();
        if (i == numLevels - 1) zoomFactor = bottomScale / Math.pow(zoomFactor, numLevels - 1);

        String curLevelTableName = zoomLevelTables.get(i);
        String lastLevelTableName = zoomLevelTables.get(i + 1);

        // then run udf and store results into the current level
        sql = "SELECT single_node_clustering_algo('" + lastLevelTableName + "', '{";
        sql += getSSVJsonStr(zoomFactor, true, true);
        // map of shard ids
        sql += ", \"tableMap\": {\"" + lastLevelTableName + "\" : \"" + curLevelTableName + "\"";
        sql += "}}'::jsonb)";

        System.out.println(sql);
        st = System.nanoTime();
        kyrixStmt.executeQuery(sql);
        System.out.println("\n************************************************");
        System.out.println(
                "Running single node clustering on Citus master took: "
                        + (System.nanoTime() - st) / 1e9
                        + "s.");
        System.out.println("************************************************\n");
    }

    private void runSingleNodeClusteringUDFInParallel(int i)
            throws SQLException, ClassNotFoundException {
        System.out.println(
                "Running single_node_clustering_algo across all shards for level" + i + "...");

        String curLevelTableName = zoomLevelTables.get(i);
        double zoomFactor = ssv.getZoomFactor();
        if (i == numLevels - 1) zoomFactor = bottomScale / Math.pow(zoomFactor, numLevels - 1);

        // run udf with inserts
        sql =
                "SELECT single_node_clustering_algo('%1$s', '{"
                        + getSSVJsonStr(zoomFactor, true, true);
        // map of shard ids
        sql += ", \"tableMap\": {";
        for (int j = 0; j < numPartitions; j++)
            sql +=
                    (j > 0 ? ", " : "")
                            + "\""
                            + zoomLevelTables.get(i + 1)
                            + "_"
                            + citusShardIds.get(i + 1).get(j)
                            + "\" : \""
                            + curLevelTableName
                            + "_"
                            + citusShardIds.get(i).get(j)
                            + "\"";
        sql += "}}'::jsonb)";
        sql =
                "SELECT run_command_on_shards('"
                        + zoomLevelTables.get(i + 1)
                        + "', $$ "
                        + sql
                        + "$$);";
        System.out.println(sql);
        st = System.nanoTime();
        ArrayList<ArrayList<String>> res = DbConnector.getQueryResult(kyrixStmt, sql);
        System.out.println("\n************************************************");
        System.out.println(
                "Running single node clustering in parallel took: "
                        + (System.nanoTime() - st) / 1e9
                        + "s.");
        System.out.println("************************************************\n");
        for (int j = 0; j < res.size(); j++) System.out.println(res.get(j).get(0));
        System.out.println();
    }

    private void mergeClustersAlongSplits(KDTree o, int i)
            throws SQLException, ClassNotFoundException {
        if (o.lc == null || o.rc == null) return;

        // recursion, merge children first
        mergeClustersAlongSplits(o.lc, i);
        mergeClustersAlongSplits(o.rc, i);

        System.out.println();
        System.out.println("Current KD-tree: " + o);
        String tableName = zoomLevelTables.get(i);
        double zoomFactor = bottomScale / Math.pow(ssv.getZoomFactor(), i);

        // get how many objects there are along the split
        String boxStr = "box('";
        if (o.splitDir == KDTree.SplitDir.VERTICAL)
            boxStr +=
                    (o.splitPoint / zoomFactor - bboxW * theta)
                            + ", "
                            + o.miny / zoomFactor
                            + ", "
                            + (o.splitPoint / zoomFactor + bboxW * theta)
                            + ", "
                            + o.maxy / zoomFactor;
        else
            boxStr +=
                    o.minx / zoomFactor
                            + ", "
                            + (o.splitPoint / zoomFactor - bboxH * theta)
                            + ", "
                            + o.maxx / zoomFactor
                            + ", "
                            + (o.splitPoint / zoomFactor + bboxH * theta);
        boxStr += "')";
        sql = "SELECT count(*) FROM " + tableName + " WHERE centroid <@ ";
        sql += boxStr + ";";
        System.out.println(sql);
        long count = Long.valueOf(DbConnector.getQueryResult(kyrixStmt, sql).get(0).get(0));
        System.out.println("# objects along this split: " + count);

        // if there is none, don't do anything
        if (count == 0) return;

        // get all objects into one table on the master
        sql = "DROP TABLE IF EXISTS merge_table;";
        System.out.println(sql);
        kyrixStmt.executeUpdate(sql);
        sql =
                "CREATE UNLOGGED TABLE merge_table AS SELECT * FROM "
                        + tableName
                        + " WHERE centroid <@ "
                        + boxStr
                        + ";";
        System.out.println(sql);
        st = System.nanoTime();
        kyrixStmt.executeUpdate(sql);
        System.out.println("Creating merge_table took: " + (System.nanoTime() - st) / 1e9 + "s.");

        // delete from current zoom level all objects along the split
        sql = "DELETE FROM " + tableName + " WHERE centroid <@ " + boxStr + ";";
        System.out.println(sql);
        st = System.nanoTime();
        kyrixStmt.executeUpdate(sql);
        System.out.println(
                "Deleting border clusters took : " + (System.nanoTime() - st) / 1e9 + "s.");

        // run udf to produce a new set of clusters, and insert directly back
        // using an INSERT INTO SELECT
        sql = "INSERT INTO " + tableName + " SELECT ";
        for (int j = 0; j < numRawColumns; j++)
            sql += "(v->>'" + columnNames.get(j) + "')::" + columnTypes.get(j) + ", ";
        sql +=
                "(v->>'hash_key')::int, (v->>'cluster_agg'),"
                        + " (v->>'cx')::real, (v->>'cy')::real,"
                        + " (v->>'minx')::real, (v->>'miny')::real,"
                        + " (v->>'maxx')::real, (v->>'maxy')::real,"
                        + " (v->>'centroid')::point ";
        sql +=
                "FROM (SELECT merge_clusters_along_splits(array_agg(to_jsonb(merge_table)), '{"
                        + getSSVJsonStr(0, false, false);
        sql +=
                ", \"splitDir\":"
                        + (o.splitDir == KDTree.SplitDir.VERTICAL
                                ? "\"vertical\""
                                : "\"horizontal\"")
                        + "}'::jsonb)v FROM merge_table) subquery";
        System.out.println(sql);
        st = System.nanoTime();
        System.out.println(kyrixStmt.executeUpdate(sql) + " new clusters inserted back.");
        System.out.println(
                "Running merge_clusters_along_splits took : "
                        + (System.nanoTime() - st) / 1e9
                        + "s.");
    }

    private void buildSpatialIndexOnLevel(int i) throws SQLException {
        System.out.println("Building spatial indexes on level" + i + "...");

        String curLevelTableName = zoomLevelTables.get(i);
        // update minx, miny, maxx, maxy, centroid && BUILD spatial index
        st = System.nanoTime();
        sql =
                "UPDATE "
                        + curLevelTableName
                        + " SET minx = cx - "
                        + bboxW / 2
                        + ", miny = cy - "
                        + bboxH / 2
                        + ", maxx = cx + "
                        + bboxW / 2
                        + ", maxy = cy + "
                        + bboxH / 2
                        + ", centroid = point(cx, cy);";
        System.out.println(sql);
        kyrixStmt.executeUpdate(sql);
        System.out.println(
                "Updating minx, miny, maxx, maxy & centroid took: "
                        + (System.nanoTime() - st) / 1e9
                        + "s.");

        sql = "DROP INDEX IF EXISTS " + curLevelTableName + "_centroid_gist;";
        System.out.println(sql);
        st = System.nanoTime();
        kyrixStmt.executeUpdate(sql);
        System.out.println(
                "Drop existing index on centroid took: " + (System.nanoTime() - st) / 1e9 + "s.");
        sql =
                "CREATE INDEX "
                        + curLevelTableName
                        + "_centroid_gist ON "
                        + curLevelTableName
                        + " USING gist(centroid);";
        System.out.println(sql);
        st = System.nanoTime();
        kyrixStmt.executeUpdate(sql);
        System.out.println(
                "Creating gist index on centroid took: " + (System.nanoTime() - st) / 1e9 + "s.");
        System.out.println();
    }

    private void saveSSVInfo() throws SQLException {
        System.out.println("Saving ssv info...");

        SSVInfo ssvInfo = new SSVInfo();
        ssvInfo.columnNames = columnNames;
        ssvInfo.tableNames = zoomLevelTables;
        ssvInfo.bboxW = bboxW;
        ssvInfo.bboxH = bboxH;
        ssvInfo.zoomFactor = ssv.getZoomFactor();
        ssvInfo.citusHashKeys = citusHashKeys;
        ssvInfo.kdTreeNodes = new ArrayList<>();
        for (KDTree o : q) ssvInfo.kdTreeNodes.add(o);

        // create table if not exist
        sql = "CREATE TABLE IF NOT EXISTS ssv_infos(project_id text, ssv_id int, gson text);";
        System.out.println(sql);
        kyrixStmt.execute(sql);

        // delete if exists
        sql = "DELETE FROM ssv_infos WHERE ssv_id = " + curSSVIndex + ";";
        System.out.println(sql);
        kyrixStmt.execute(sql);

        // serialize
        String jsonText = gson.toJson(ssvInfo);
        sql =
                "INSERT INTO ssv_infos VALUES ('"
                        + Main.getProject().getName()
                        + "', "
                        + curSSVIndex
                        + ", '"
                        + jsonText
                        + "');";
        System.out.println(sql);
        kyrixStmt.execute(sql);
    }

    public SSVInfo getSSVInfo(int ssvIndex) throws SQLException, ClassNotFoundException {
        sql =
                "SELECT gson FROM ssv_infos WHERE project_id = '"
                        + Main.getProject().getName()
                        + "' and ssv_id = "
                        + ssvIndex
                        + ";";
        System.out.println(sql);
        String jsonText = DbConnector.getQueryResult(Config.databaseName, sql).get(0).get(0);
        SSVInfo res = gson.fromJson(jsonText, SSVInfo.class);
        return res;
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromRegion(
            Canvas c, int layerId, String regionWKT, String predicate, Box newBox, Box oldBox)
            throws Exception {
        // get ssvInfo if it doesn't exist
        String ssvId = c.getLayers().get(layerId).getSSVId();
        int ssvIndex = Integer.valueOf(ssvId.substring(0, ssvId.indexOf("_")));
        SSVInfo ssvInfo = getSSVInfo(ssvIndex);

        // get column list string
        String colListStr = "";
        for (int i = 0; i < ssvInfo.columnNames.size(); i++)
            colListStr += ssvInfo.columnNames.get(i) + ", ";
        colListStr += "hash_key, cluster_agg, cx, cy, minx, miny, maxx, maxy";

        // construct range query
        int bboxW = ssvInfo.bboxW;
        int bboxH = ssvInfo.bboxH;
        String sql =
                "SELECT "
                        + colListStr
                        + " FROM "
                        + ssvInfo.tableNames.get(c.getPyramidLevel())
                        + " WHERE ";
        sql +=
                "centroid <@ box('"
                        + (newBox.getMinx() - bboxW / 2)
                        + ", "
                        + (newBox.getMiny() - bboxH / 2)
                        + ", "
                        + (newBox.getMaxx() + bboxW / 2)
                        + ", "
                        + (newBox.getMaxy() + bboxH / 2)
                        + "')";

        // don't get anything outside old box
        if (oldBox.getWidth() > 0) // when there is not an old box, oldBox is set to -1e5, -1e5,...
        sql +=
                    " and not (centroid <@ box('"
                            + (oldBox.getMinx() + bboxW / 2)
                            + ", "
                            + (oldBox.getMiny() + bboxH / 2)
                            + ", "
                            + (oldBox.getMaxx() - bboxW / 2)
                            + ", "
                            + (oldBox.getMaxy() - bboxH / 2)
                            + "') )";

        // if table is distributed, only hit shards that intersect with newBox
        if (c.getPyramidLevel() > L) {
            sql += " and (";
            double zoomFactor = bottomScale / Math.pow(ssvInfo.zoomFactor, c.getPyramidLevel());
            for (int i = 0; i < ssvInfo.kdTreeNodes.size(); i++) {
                KDTree o = ssvInfo.kdTreeNodes.get(i);
                if (o.maxx / zoomFactor < newBox.getMinx() - bboxW / 2) continue;
                if (newBox.getMaxx() + bboxW / 2 < o.minx / zoomFactor) continue;
                if (o.maxy / zoomFactor < newBox.getMiny() - bboxH / 2) continue;
                if (newBox.getMaxy() + bboxH / 2 < o.miny / zoomFactor) continue;
                if (sql.charAt(sql.length() - 1) != '(') sql += " or ";
                sql += "hash_key = " + ssvInfo.citusHashKeys.get(i);
            }
            sql += ")";
        }

        // predicates
        if (predicate.length() > 0) sql += " and " + predicate;

        // run sql
        sql += ";";
        System.out.println(sql);

        return DbConnector.getQueryResult(Config.databaseName, sql);
    }

    @Override
    public ArrayList<ArrayList<String>> getDataFromTile(
            Canvas c, int layerId, int minx, int miny, String predicate) throws Exception {
        return getDataFromRegion(
                c,
                layerId,
                "",
                predicate,
                new Box(minx, miny, minx + Config.tileW, miny + Config.tileH),
                new Box(-1e5, -1e5, -1e5, -1e5));
    }
}
