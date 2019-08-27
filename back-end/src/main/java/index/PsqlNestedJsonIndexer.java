package index;

import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import java.io.*;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Date;
import java.util.Stack;
import main.Config;
import main.DbConnector;
import main.Main;
import project.*;

public class PsqlNestedJsonIndexer extends PsqlNativeBoxIndexer {

    private static PsqlNestedJsonIndexer instance = null;
    private int rowCount;
    // thread-safe instance getter
    public static synchronized PsqlNestedJsonIndexer getInstance() {

        if (instance == null) instance = new PsqlNestedJsonIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {
        this.rowCount = 0;
        Layer l = c.getLayers().get(layerId);
        // Transform trans = l.getTransform();
        // HashMap<String, Integer> hashMap = new HashMap<>();

        String[] cids = c.getId().split("_");
        // e.g. treemap_0__2: treemap 0, -2 zoom
        String hid = cids[1];
        // this is used to find the correct hierarchy
        Hierarchy h = null;
        ArrayList<Hierarchy> hierarchies = Main.getProject().getHierarchies();
        for (Hierarchy hierarchy : hierarchies) {
            h = hierarchy;
            if (hid.equals(h.getName().split("_")[1])) {
                System.out.println("hierarchy name:" + h.getName());
                break;
            }
        }
        assert h != null;
        String hierTableName = "hierarchy_" + Main.getProject().getName() + "_" + h.getName();

        Node root = new Node();
        String rootId;
        double rootValue;
        int rootHeight;
        if (!h.getIndexed()) {
            root = expandHierarchy(h);
        } else {
            Statement getRootStmt = DbConnector.getStmtByDbName(Config.databaseName);
            String getRootQuery = "select * from " + hierTableName + " where depth = 0";
            ResultSet rootRs = getRootStmt.executeQuery(getRootQuery);
            while (rootRs.next()) {
                System.out.print("a row was returned.");
                rootId = rootRs.getString(1);
                rootHeight = rootRs.getInt(5);
                rootValue = rootRs.getDouble(3);
                root.setId(rootId);
                root.setDepth(0);
                root.setValue(rootValue);
                root.setHeight(rootHeight);
            }
            rootRs.close();
        }

        // step 0: create tables for storing bboxes and tiles
        String bboxTableName =
                "bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;

        // drop table if exists
        Statement dropCreateStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String sql = "drop table if exists " + bboxTableName + ";";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);

        // create the bbox table
        sql = "CREATE UNLOGGED TABLE " + bboxTableName + " (";
        sql += "id text, parent text, value double precision, depth int, height int, ";
        sql +=
                "cx double precision, cy double precision, minx double precision, miny "
                        + "double precision, maxx double precision, maxy double precision, geom box)";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);
        dropCreateStmt.close();

        int pyramidLevel = c.getPyramidLevel();
        h.calcLayout(pyramidLevel, bboxTableName, root);

        // time
        long startTs = (new Date()).getTime();
        long lastTs = startTs;
        long currTs = 0;
        // compute geom field in the database, where it can happen in parallel
        Statement setGeomFieldStmt = DbConnector.getStmtByDbName(Config.databaseName);
        sql = "UPDATE " + bboxTableName + " SET geom=box( point(minx,miny), point(maxx,maxy) );";
        System.out.println(sql);
        setGeomFieldStmt.executeUpdate(sql);
        setGeomFieldStmt.close();

        currTs = (new Date()).getTime();
        System.out.println(((currTs - startTs) / 1000) + " secs for setting geom field");
        startTs = currTs;

        // create index - gist/spgist require logged table type
        // TODO: consider sp-gist
        Statement createIndexStmt = DbConnector.getStmtByDbName(Config.databaseName);
        sql = "CREATE INDEX sp_" + bboxTableName + " ON " + bboxTableName + " USING gist (geom);";
        System.out.println(sql);
        createIndexStmt.executeUpdate(sql);
        createIndexStmt.close();

        currTs = (new Date()).getTime();
        System.out.println(
                ((currTs - startTs) / 1000)
                        + " secs for CREATE INDEX sp_"
                        + bboxTableName
                        + " ON "
                        + bboxTableName);
        startTs = currTs;
    }

    private Node expandHierarchy(Hierarchy h) throws ClassNotFoundException, SQLException {
        // not streaming

        String filepath = h.getFilepath();
        // System.out.println("hierarchy filepath:" + filepath);

        String hierTableName = "hierarchy_" + Main.getProject().getName() + "_" + h.getName();

        // drop table if exists
        Statement dropCreateStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String sql = "drop table if exists " + hierTableName + ";";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);

        // create the hierarchy table
        sql = "CREATE UNLOGGED TABLE " + hierTableName + " (";
        sql += "id text, parent text, value double precision, depth int, height int)";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);
        dropCreateStmt.close();

        // prepare the data structure
        Stack<Node> stack = new Stack<>();
        Node root = new Node();

        // prepare the preparedstatement
        String insertSql = "INSERT INTO " + hierTableName + " VALUES (?,?,?,?,?)";
        System.out.println(insertSql);
        PreparedStatement preparedStmt =
                DbConnector.getPreparedStatement(Config.databaseName, insertSql);
        int batchsize = Config.bboxBatchSize;

        FileReader fileReader = null;
        try {
            fileReader = new FileReader(filepath);
        } catch (FileNotFoundException e) {
            e.printStackTrace();
        }

        // parse the json
        assert fileReader != null;
        JsonReader reader = new JsonReader(fileReader);
        try {
            root = readNode(reader, h, stack, preparedStmt);
        } catch (IOException e1) {
            // TODO Auto-generated catch block
            e1.printStackTrace();
        }

        // insert tail stuff
        if (this.rowCount % batchsize != 0) {
            preparedStmt.executeBatch();
        }
        preparedStmt.close();

        h.setIndexed(true);
        return root;
    }

    private Node readNode(
            JsonReader reader,
            Hierarchy hierarchy,
            Stack<Node> stack,
            PreparedStatement preparedStmt)
            throws IOException, SQLException {
        reader.beginObject();
        String fieldName = null;
        String id;
        double value = 0;

        int batchsize = Config.bboxBatchSize;

        Node parent;
        if (!stack.empty()) {
            parent = stack.peek();
        } else {
            parent = new Node();
        }

        Node node = new Node();
        node.setDepth(stack.size());
        node.setParent(parent.getId());
        stack.push(node);

        while (true) {
            JsonToken token = reader.peek();

            if (token.equals(JsonToken.BEGIN_ARRAY)) {
                value = readChildren(reader, hierarchy, stack, preparedStmt);
                node.setValue(value);
            } else if (token.equals(JsonToken.END_OBJECT)) {
                stack.pop();
                // set the height of its father
                if (node.getHeight() < 0) node.setHeight(0);
                if (parent.getHeight() < node.getHeight() + 1)
                    parent.setHeight(node.getHeight() + 1);
                reader.endObject();

                // add to the prepared statment
                preparedStmt.setString(1, node.getId());
                preparedStmt.setString(2, node.getParent());
                preparedStmt.setDouble(3, node.getValue());
                preparedStmt.setInt(4, node.getDepth());
                preparedStmt.setInt(5, node.getHeight());
                preparedStmt.addBatch();
                this.rowCount++;
                if (this.rowCount % batchsize == 0) {
                    System.out.println(this.rowCount + " Rows! Stack: " + stack);
                    preparedStmt.executeBatch();
                }

                return node;
            } else {
                if (token.equals(JsonToken.NAME)) {
                    // get the current token
                    fieldName = reader.nextName();
                } else if (hierarchy.getId().equals(fieldName)) {
                    // move to next token
                    id = reader.nextString();
                    node.setId(id);
                } else if (hierarchy.getValue().equals(fieldName)) {
                    // move to next token
                    value = reader.nextDouble();
                    node.setValue(value);
                    // System.out.println("value:" + value);
                } else {
                    System.out.println("Unexpected:" + token);
                }
            }
        }
    }

    private double readChildren(
            JsonReader reader,
            Hierarchy hierarchy,
            Stack<Node> stack,
            PreparedStatement preparedStmt)
            throws IOException, SQLException {
        reader.beginArray();
        double sumValue = 0;
        Node child;

        while (true) {
            JsonToken token = reader.peek();

            if (token.equals(JsonToken.END_ARRAY)) {
                reader.endArray();
                return sumValue;
            } else if (token.equals(JsonToken.BEGIN_OBJECT)) {
                child = readNode(reader, hierarchy, stack, preparedStmt);
                sumValue += child.getValue();
            } else if (token.equals(JsonToken.END_OBJECT)) {
                reader.endObject();
                System.out.print("end object in array ??");
            } else {
                System.out.print("else ??" + " ");
            }
        }
    }
}
