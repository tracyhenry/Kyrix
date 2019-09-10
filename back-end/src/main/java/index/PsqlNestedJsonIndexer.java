package index;

import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Date;
import java.util.Stack;
import javax.script.ScriptException;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Hierarchy;
import project.Layer;
import project.Node;

public class PsqlNestedJsonIndexer extends PsqlNativeBoxIndexer {

    protected static PsqlNestedJsonIndexer instance = null;
    protected int rowCount;
    // thread-safe instance getter
    public static synchronized PsqlNestedJsonIndexer getInstance() {

        if (instance == null) instance = new PsqlNestedJsonIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {
        this.rowCount = 0;

        // step 0: get hierarchy object
        Hierarchy h = this.getHierarchy(c, layerId);

        // step 1: expand the hierarchy & get the root
        Node root = this.getRoot(h);

        // step 2: create bboxtable
        this.createBBoxTable(c, layerId);

        // step 3: calculate the layout and store it in the bboxtable
        // this is the part where the sub indexers need to implement for them selves.
        this.calcLayout(c, layerId, h, root);

        // step 4: create index
        this.createIndex(c, layerId);
    }

    protected void calcLayout(Canvas c, int layerId, Hierarchy h, Node root)
            throws SQLException, ClassNotFoundException, ScriptException, NoSuchMethodException {}

    protected void createIndex(Canvas c, int layerId) throws SQLException, ClassNotFoundException {
        String bboxTableName = this.getBBoxTableName(c, layerId);
        // time
        long startTs = (new Date()).getTime();
        long lastTs = startTs;
        long currTs = 0;
        // compute geom field in the database, where it can happen in parallel
        Statement setGeomFieldStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String sql =
                "UPDATE " + bboxTableName + " SET geom=box( point(minx,miny), point(maxx,maxy) );";
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

    protected void createBBoxTable(Canvas c, int layerId)
            throws SQLException, ClassNotFoundException {
        // step 0: create tables for storing bboxes and tiles
        String bboxTableName = this.getBBoxTableName(c, layerId);

        // drop table if exists
        Statement dropCreateStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String sql = "drop table if exists " + bboxTableName + ";";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);

        // create the bbox table
        sql = "CREATE UNLOGGED TABLE " + bboxTableName + " (";
        sql += "id text, parent text, value double precision, depth int, height int, count int, ";
        sql += "x double precision, y double precision, w double precision, h double precision, ";
        sql +=
                "cx double precision, cy double precision, minx double precision, miny "
                        + "double precision, maxx double precision, maxy double precision, geom box)";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);
        dropCreateStmt.close();
    }

    protected String getBBoxTableName(Canvas c, int layerId) {
        return (String)
                ("bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId);
    }

    protected Node getRoot(Hierarchy h) throws SQLException, ClassNotFoundException {
        Node root = new Node();
        String rootId;
        double rootValue;
        int rootHeight;
        String hierTableName = this.getHierarchyTableName(h);
        if (!h.getIndexed()) {
            root = this.expandHierarchy(h);
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
            rootRs = null;
        }

        return root;
    }

    protected Hierarchy getHierarchy(Canvas c, int layerId) {
        Layer l = c.getLayers().get(layerId);

        String[] cids = c.getId().split("_");
        // e.g. treemap_0__2: treemap 0, -2 zoom
        String hid = cids[1];
        // this is used to find the correct hierarchy
        Hierarchy h = null;
        ArrayList<Hierarchy> hierarchies = Main.getProject().getHierarchies();
        for (Hierarchy hierarchy : hierarchies) {
            h = hierarchy;
            if (hid.equals(h.getName().split("_")[1])) {
                System.out.println("\nhierarchy name:" + h.getName());
                break;
            }
        }
        assert h != null;

        return h;
    }

    protected String getHierarchyTableName(Hierarchy h) {
        return (String) ("hierarchy_" + Main.getProject().getName() + "_" + h.getName());
    }

    protected Node expandHierarchy(Hierarchy h) throws ClassNotFoundException, SQLException {
        // not streaming

        String filepath = h.getFilepath();
        // System.out.println("hierarchy filepath:" + filepath);

        String hierTableName = this.getHierarchyTableName(h);

        // drop table if exists
        Statement dropCreateStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String sql = "drop table if exists " + hierTableName + ";";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);

        // create the hierarchy table
        sql = "CREATE UNLOGGED TABLE " + hierTableName + " (";
        sql += "id text, parent text, value double precision, depth int, height int, count int)";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);
        dropCreateStmt.close();

        // prepare the data structure
        Stack<Node> stack = new Stack<>();
        Node root = new Node();

        // prepare the preparedstatement
        String insertSql = "INSERT INTO " + hierTableName + " VALUES (?,?,?,?,?,?)";
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
            root = this.readNode(reader, h, stack, preparedStmt);
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

    protected Node readNode(
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
                Node info = this.readChildren(reader, hierarchy, stack, preparedStmt);
                value = info.getValue();
                node.setValue(value);
                node.setCount(info.getCount());
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
                preparedStmt.setInt(6, node.getCount());
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

    protected Node readChildren(
            JsonReader reader,
            Hierarchy hierarchy,
            Stack<Node> stack,
            PreparedStatement preparedStmt)
            throws IOException, SQLException {
        reader.beginArray();
        double sumValue = 0;
        int count = 0;
        Node child;
        Node info = new Node();
        info.setValue(0);
        info.setCount(0);

        // if sth wrong happens, the reader will reach the end and throw error.
        while (true) {
            JsonToken token = reader.peek();

            if (token.equals(JsonToken.END_ARRAY)) {
                reader.endArray();
                info.setValue(sumValue);
                info.setCount(count);
                return info;
            } else if (token.equals(JsonToken.BEGIN_OBJECT)) {
                child = this.readNode(reader, hierarchy, stack, preparedStmt);
                sumValue += child.getValue();
                // should count be the size of entire sub tree
                // or just the count of its children
                count++;
                // count += child.getCount() == 0 ? 1 : child.getCount();
            } else if (token.equals(JsonToken.END_OBJECT)) {
                reader.endObject();
                System.out.print(" end object in array ??");
            } else {
                System.out.print(" else: token:" + token);
            }
        }
    }
}
