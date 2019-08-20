package index;

import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import java.io.*;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Stack;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Hierarchy;
import project.Layer;
import project.Node;

public class PsqlNestedJsonIndexer extends PsqlNativeBoxIndexer {

    private static PsqlNestedJsonIndexer instance = null;

    // thread-safe instance getter
    public static synchronized PsqlNestedJsonIndexer getInstance() {

        if (instance == null) instance = new PsqlNestedJsonIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        Layer l = c.getLayers().get(layerId);
        // Transform trans = l.getTransform();
        // HashMap<String, Integer> hashMap = new HashMap<>();

        String[] cids = c.getId().split("_");
        // e.g. treemap_0__2: treemap 0, -2 zoom
        String hid = cids[1];

        // if (cids[2].equals("")) return;
        // if (Integer.parseInt(cids[2]) > 0 || l.isRetainSizeZoom()) return;

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

        if (!h.getIndexed()) {
            expandHierarchy(h);
        }

        // step 0: create tables for storing bboxes and tiles
        //        String bboxTableName =
        //                "bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" +
        // layerId;
        //
        //        // drop table if exists
        //        Statement dropCreateStmt = DbConnector.getStmtByDbName(Config.databaseName);
        //        String sql = "drop table if exists " + bboxTableName + ";";
        //        System.out.println(sql);
        //        dropCreateStmt.executeUpdate(sql);
        //
        //        // create the bbox table
        //        // yes, citus supports unlogged tables!
        //        //
        // http://docs.citusdata.com/en/v8.1/performance/performance_tuning.html#postgresql-tuning
        //        sql = "CREATE UNLOGGED TABLE " + bboxTableName + " (";
        //        // for (int i = 0; i < trans.getColumnNames().size(); i++)
        //        // sql += trans.getColumnNames().get(i) + " text, ";
        //        sql += "id text, parent text, value double precision, depth int, height int, ";
        //        sql +=
        //                "cx double precision, cy double precision, minx double precision, miny
        // double precision, maxx double precision, maxy double precision, geom box)";
        //        System.out.println(sql);
        //        dropCreateStmt.executeUpdate(sql);
        //        dropCreateStmt.close();

    }

    private void expandHierarchy(Hierarchy h) throws ClassNotFoundException, SQLException {
        // not streaming
        // BufferedReader reader = new BufferedReader(new FileReader(filepath));
        // Gson gson = new GsonBuilder().create();
        // Node root = gson.fromJson(reader, Node.class);
        // System.out.println("hierarchy filepath:" + root);

        String filepath = h.getFilepath();
        // System.out.println("hierarchy filepath:" + filepath);

        String hierTableName = "hierarchy_" + Main.getProject().getName() + "_" + h.getName();

        // drop table if exists
        Statement dropCreateStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String sql = "drop table if exists " + hierTableName + ";";
        // System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);

        // create the hierarchy table
        sql = "CREATE UNLOGGED TABLE " + hierTableName + " (";
        sql += "id text, parent text, value double precision, depth int, height int)";
        // System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);
        dropCreateStmt.close();

        // prepare the data structure
        Stack<Node> stack = new Stack<>();
        ArrayList<Node> nodes = new ArrayList<>();

        // prepare the preparedstatement
        //        String insertSql = "INSERT INTO " + hierTableName + " VALUES (?,?,?,?,?)";
        //        System.out.println(insertSql);
        //        PreparedStatement preparedStmt =
        //                DbConnector.getPreparedStatement(Config.databaseName, insertSql);
        //        int batchsize = Config.bboxBatchSize;

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
            readNode(reader, h, stack, nodes);
        } catch (IOException e1) {
            // TODO Auto-generated catch block
            e1.printStackTrace();
        }

        // System.out.println(nodes);

        h.setIndexed(true);
    }

    private static double readNode(
            JsonReader reader, Hierarchy hierarchy, Stack<Node> stack, ArrayList<Node> nodes)
            throws IOException {
        reader.beginObject();
        String fieldName = null;
        String id;
        double value = 0;
        int height = 0;

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
        nodes.add(node);

        while (true) {
            JsonToken token = reader.peek();

            if (token.equals(JsonToken.BEGIN_ARRAY)) {
                // System.out.println("Children [ ");
                value = readChildren(reader, hierarchy, stack, nodes);
                node.setValue(value);
                System.out.print("]");
            } else if (token.equals(JsonToken.END_OBJECT)) {
                // System.out.println("END_OBJECT!!!");
                stack.pop();
                // set the height of its father
                if (node.getHeight() < 0) node.setHeight(0);
                if (!stack.empty()) stack.peek().setHeight(node.getHeight() + 1);
                // System.out.println("value:" + value);
                // System.out.println("height:" + height);
                reader.endObject();
                // System.out.println("}");
                return value;
            } else {
                if (token.equals(JsonToken.NAME)) {
                    // get the current token
                    fieldName = reader.nextName();
                } else if (hierarchy.getId().equals(fieldName)) {
                    // move to next token
                    id = reader.nextString();
                    node.setId(id);
                    // System.out.println("id: " + id);
                } else if (hierarchy.getValue().equals(fieldName)) {
                    // move to next token
                    value = reader.nextDouble();
                    node.setValue(value);
                    // System.out.println("value:" + value);
                } else {
                    // System.out.println("Unexpected:" + token);
                }
            }
        }
    }

    private static double readChildren(
            JsonReader reader, Hierarchy hierarchy, Stack<Node> stack, ArrayList<Node> nodes)
            throws IOException {
        reader.beginArray();
        double sumValue = 0;
        double value;

        while (true) {
            JsonToken token = reader.peek();

            if (token.equals(JsonToken.END_ARRAY)) {
                reader.endArray();
                return sumValue;
            } else if (token.equals(JsonToken.BEGIN_OBJECT)) {
                value = readNode(reader, hierarchy, stack, nodes);
                sumValue += value;
            } else if (token.equals(JsonToken.END_OBJECT)) {
                reader.endObject();
                System.out.print("end object in array ??" + " ");
            } else {
                System.out.print("else ??" + " ");
            }
        }
    }
}
