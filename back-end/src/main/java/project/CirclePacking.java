package project;

import com.coveo.nashorn_modules.FilesystemFolder;
import com.coveo.nashorn_modules.Require;
import java.io.File;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Stack;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.DbConnector;
import main.Main;
import third_party.Exclude;

public class CirclePacking extends Hierarchy {
    private double height;
    private double width;
    private double x;
    private double y;

    private double padding;

    @Exclude private Stack<PackNode> prestack;
    @Exclude private Stack<PackNode> poststack;
    @Exclude private int rowCount;
    @Exclude private PreparedStatement insertStmt;
    @Exclude private String bboxTableName;
    @Exclude private int zoomLevel;
    @Exclude private Boolean flag;
    @Exclude private NashornScriptEngine engine;
    // CirclePacking(){
    //     super();
    //     prestack = new Stack<>();
    //     poststack = new Stack<>();
    // }

    public void setPadding(double padding) {
        this.padding = padding;
    }

    public double getPadding() {
        return padding;
    }

    public void setHeight(double height) {
        this.height = height;
    }

    public double getHeight() {
        return height;
    }

    public void setWidth(double width) {
        this.width = width;
    }

    public double getWidth() {
        return width;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getX() {
        return x;
    }

    public void setY(double y) {
        this.y = y;
    }

    public double getY() {
        return y;
    }

    @Override
    public String toString() {
        return "CirclePacking{"
                + "filepath='"
                + filepath
                + '\''
                + "type='"
                + type
                + '\''
                + "id='"
                + id
                + '\''
                + "value='"
                + value
                + '\''
                + "children='"
                + children
                + '\''
                + ", indexed="
                + indexed
                + ", zoomFactor="
                + zoomFactor
                + '}';
    }

    @Override
    public void calcLayout(Canvas c, int layerId, Node rootNode)
            throws SQLException, ClassNotFoundException, ScriptException, NoSuchMethodException {
        super.calcLayout(c, layerId, rootNode);
        this.poststack = new Stack<>();
        this.prestack = new Stack<>();

        Layer l = c.getLayers().get(layerId);
        int zoomLevel = l.getLevel();
        String bboxTableName =
                "bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;

        String hierTableName = "hierarchy_" + Main.getProject().getName() + "_" + getName();
        this.bboxTableName = bboxTableName;
        this.zoomLevel = zoomLevel;
        this.flag = true;

        // prepare the preparedstatement
        // 16 cols: 6(id, parent, etc.) + 4(x, y, w, h) + 6(cx, cy, etc.)
        String insertSql =
                "INSERT INTO " + bboxTableName + " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
        System.out.println(insertSql);
        this.insertStmt = DbConnector.getPreparedStatement(Config.databaseName, insertSql);
        PackNode root = new PackNode(rootNode);
        PackNode node;

        engine = (NashornScriptEngine) new ScriptEngineManager().getEngineByName("nashorn");
        FilesystemFolder rootFolder = FilesystemFolder.create(new File(Config.d3Dir), "UTF-8");
        Require.enable(engine, rootFolder);

        // register the data transform function with nashorn
        engine.put("renderingParams", Main.getProject().getRenderingParams());
        String script =
                "var d3 = require('d3');\n"; // TODO: let users specify all required d3 libraries.
        script += "var rendParams = JSON.parse(renderingParams);";
        // script += "var pNode = rendParams.printNode.parseFunction();";
        script += "var pNode = eval(rendParams.packSib);";
        script += "print(pNode.toString());";
        script += "print(pNode);";
        engine.eval(script);

        // get rendering parameters
        // JSObject jso = (JSObject) root;
        // PackNode obj = (PackNode) engine.invokeFunction("pNode", jso);
        // Object obj = (PackNode) engine.invokeFunction("packSib", root);

        // System.out.println("obj:" + obj.getMember("id"));
        // System.out.println("obj2:" + obj);
        //        System.out.println("obj class:" + obj.getClass());

        this.prestack.push(root);
        this.poststack.push(root);
        while (!poststack.empty()) {
            node = poststack.pop();
            firstRound(node);
        }
    }

    void firstRound(PackNode node)
            throws SQLException, ClassNotFoundException, ScriptException, NoSuchMethodException {
        if (node.status == 0) {
            poststack.push(node);
            node.status = 1;

            if (node.height > 0) {
                ArrayList<PackNode> children = getChildren(node);
                for (PackNode child : children) {
                    poststack.push(child);
                }
                // step 3: release the memory!
                children = null;
            } else {
                node.r = Math.sqrt(node.value);
            }
        } else if (node.status == 1) {
            // System.out.println("node:" + node);
            if (node.height > 0) {
                ArrayList<PackNode> children = getChildren(node);
                // children = (ArrayList<PackNode>) engine.invokeFunction("packSib", children);
                System.out.println("before packSib:" + children);
                // PackNode parent = (PackNode) engine.invokeFunction("packSib", children);
                engine.invokeFunction("packSib", children);
                // System.out.println("after parent:" + parent);

                System.out.println("after packSib:" + children);
            }

            //            PackNode[] params = children.toArray();
            //            JSObject ret = engine.invokeFunction("d3.packSiblings", children);
            //            System.out.println("not possible:" + ret.get)
            if (this.zoomLevel == 0 && node.height == 0) {
                System.out.println("stack:" + poststack);
                System.out.println("current:" + node);
            }

            node.status = 2;
        } else {
            System.out.println("Sth went wrong! current node: " + node);
        }
    }

    ArrayList<PackNode> getChildren(PackNode node) throws SQLException, ClassNotFoundException {
        ArrayList<PackNode> children = new ArrayList<>();
        String hierTableName = "hierarchy_" + Main.getProject().getName() + "_" + getName();
        Statement getChildrenStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String getChildrenQuery =
                "select * from "
                        + hierTableName
                        + " where parent = '"
                        + node.getId()
                        + "' order by value desc";
        ResultSet rs = getChildrenStmt.executeQuery(getChildrenQuery);
        while (rs.next()) {
            String childId = rs.getString(1);
            // System.out.println("a row was returned. ID: " + childId);
            double childV = rs.getDouble(3);
            int childH = rs.getInt(5);
            int childC = rs.getInt(6);
            PackNode child =
                    new PackNode(
                            new Node(
                                    childId,
                                    node.getId(),
                                    childV,
                                    node.getDepth() + 1,
                                    childH,
                                    childC));
            children.add(child);
        }
        rs.close();
        return children;
    }
}
