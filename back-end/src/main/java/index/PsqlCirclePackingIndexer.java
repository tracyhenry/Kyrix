package index;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Stack;
import javax.script.ScriptException;
import jdk.nashorn.api.scripting.JSObject;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import main.Config;
import main.DbConnector;
import main.Main;
import project.*;

public class PsqlCirclePackingIndexer extends PsqlNestedJsonIndexer {
    protected static PsqlCirclePackingIndexer instance = null;

    private transient Stack<PackNode> stack;
    private transient int rowCount;
    private transient PreparedStatement insertStmt;
    private transient PreparedStatement updateStmt;
    private transient int zoomLevel;
    private transient Boolean flag;
    private transient NashornScriptEngine engine;
    private transient HashMap<PackNode, ArrayList<PackNode>> map;
    // 0 for before 1 round, 1 for first round, 2 for second round;
    private transient int status;
    private transient double k;
    private transient double dx;
    private transient double dy;
    private transient long startTs;
    private transient long currTs;
    private transient long lastTs;

    // thread-safe instance getter
    public static synchronized PsqlCirclePackingIndexer getInstance() {

        if (instance == null) instance = new PsqlCirclePackingIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {
        // super.createMV(c, layerId);
        CirclePacking h = (CirclePacking) this.getHierarchy(c, layerId);
        System.out.println("Circle Packing:" + h);
        Node root = this.getRoot(h);
        System.out.println("PackNode Root:" + root);
        this.createBBoxTable(c, layerId);

        this.calcLayout(c, layerId, h, root);

        this.createIndex(c, layerId);
    }

    @Override
    public void calcLayout(Canvas c, int layerId, Hierarchy hierarchy, Node rootNode)
            throws SQLException, ClassNotFoundException, ScriptException, NoSuchMethodException {
        // super.calcLayout(c, layerId, rootNode);
        CirclePacking h = (CirclePacking) hierarchy;

        // step 0: initialize and create Pack Table
        this.status = 0;
        this.map = new HashMap<>();
        this.stack = new Stack<>();
        if (this.engine == null) this.engine = setupNashorn("function(){}");
        String script = "eval(JSON.parse(renderingParams).packSib);";
        engine.eval(script);
        this.k = 1;
        this.startTs = (new Date()).getTime();
        this.lastTs = startTs;
        this.currTs = 0;
        this.createPackTable(h);

        Layer l = c.getLayers().get(layerId);
        // this.zoomLevel = l.getLevel();
        this.zoomLevel = l.getZoomLevel();
        // assuming all nodes are big enough
        this.dx = h.getWidth() * this.getZoomCoef(h);
        this.dy = h.getHeight() * this.getZoomCoef(h);
        this.flag = true;

        // step 1: first round: pre order assign leaf
        // and post order pack children
        this.status = 1;
        PackNode root = new PackNode(rootNode);
        System.out.println("before 1 round, packnode root:" + root);
        root.setX(this.dx / 2);
        root.setY(this.dy / 2);
        this.stack.push(root);
        double r = 0;
        PackNode node;
        while (!this.stack.empty()) {
            node = this.stack.pop();
            r = this.firstRound(h, node);
            tick();
        }
        this.insertPackNode(root);
        // finish up on the tail nodes
        this.finishTail(this.insertStmt);
        root.setStatus(0);

        // step 2: second round: post order pack children
        this.status = 2;
        this.k = r / Math.min(this.dx, this.dy);
        this.stack.push(root);
        while (!this.stack.empty()) {
            node = this.stack.pop();
            this.secondRound(h, node);
            tick();
        }
        System.out.println("root after 2 round:" + root);
        this.updatePackNode(root);
        this.finishTail(this.updateStmt);
        root.setStatus(0);
        String bboxTableName = this.getBBoxTableName(c, layerId);

        // step 3: translate child
        // prepare the prepared statement
        // 17 cols: 7(id, parent, etc.) + 4(x, y, w, h) + 6(cx, cy, etc.)
        this.status = 3;
        String insertSql =
                "INSERT INTO " + bboxTableName + " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
        System.out.println(insertSql);
        this.insertStmt = DbConnector.getPreparedStatement(Config.databaseName, insertSql);

        this.k = Math.min(this.dx, this.dy) / (2 * root.getR());
        this.translateChild(root, null, this.k);
        this.stack.push(root);
        while (!this.stack.empty()) {
            node = this.stack.pop();
            this.thirdRound(h, node);
            tick();
        }
        System.out.println("root after 3 round:" + root);
        this.finishTail(this.insertStmt);

        if (!this.flag) System.out.println("Some nodes are too small");
        else System.out.println("All nodes are big enough");
    }

    double firstRound(CirclePacking h, PackNode node)
            throws SQLException, ClassNotFoundException, ScriptException, NoSuchMethodException {
        if (node.getStatus() == 0) {
            this.stack.push(node);
            node.setStatus(1);

            if (node.getHeight() > 0) {
                ArrayList<PackNode> children = this.getRawChildren(h, node);
                this.map.put(node, children);
                for (PackNode child : children) {
                    this.stack.push(child);
                }
            } else {
                double zoomCoef = this.getZoomCoef(h);
                node.setR(Math.sqrt(node.getValue() * zoomCoef));
            }
        } else if (node.getStatus() == 1) {
            if (node.getHeight() > 0) {
                this.packChildren(node, 0, 1);
            }

            node.setStatus(2);
        } else {
            System.out.println("Sth went wrong! current node: " + node);
        }
        return node.getR();
    }

    void tick() {
        this.currTs = (new Date()).getTime();
        if (this.currTs / 10000 > this.lastTs / 10000) { // print every N=10 seconds
            long secs = (this.currTs - lastTs) / 1000;
            this.lastTs = this.currTs;
            if (secs > 0) {
                System.out.println(
                        "status:"
                                + this.status
                                + "  "
                                + secs
                                + " secs: "
                                + this.rowCount
                                + " records inserted. "
                                + (this.rowCount / secs)
                                + " recs/sec."
                                + "total time used: "
                                + ((this.currTs - this.startTs) / 1000)
                                + " seconds.");
            }
        }
    }

    double secondRound(CirclePacking h, PackNode node)
            throws SQLException, ClassNotFoundException, ScriptException, NoSuchMethodException {
        if (node.getStatus() == 0) {
            this.stack.push(node);
            node.setStatus(1);

            if (node.getHeight() > 0) {
                ArrayList<PackNode> children = this.getPackChildren(h, node);
                if (node == null) {
                    System.out.println("secondRound NODE NULL");
                }
                if (children == null) {
                    System.out.println("secondRound CHILDREN NULL");
                }
                this.map.put(node, children);
                for (PackNode child : children) {
                    this.stack.push(child);
                }
                // children = null;
            }
        } else if (node.getStatus() == 1) {
            // System.out.println("node:" + node);
            if (node.getHeight() > 0) {
                this.packChildren(node, h.getPadding() * this.getZoomCoef(h), this.k);
            }
            node.setStatus(2);
        } else {
            System.out.println("Sth went wrong! current node: " + node);
        }
        return node.getR();
    }

    int thirdRound(CirclePacking h, PackNode node) throws SQLException, ClassNotFoundException {
        int count = 0;
        Boolean flag = true;
        // if this node is too small, there is no need to insert its descandants
        if (node.getHeight() > 0) {
            ArrayList<PackNode> children = this.getPackChildren(h, node);
            for (PackNode child : children) {
                translateChild(child, node, this.k);
                flag = testNode(h, child);
                if (flag) {
                    count++;
                    this.stack.push(child);
                }
            }
            node.setCount(count);
        }
        insertBBoxNode(node);
        return count;
    }

    Boolean testNode(CirclePacking h, PackNode node) {
        double r = node.getR();
        if (r < h.getThreshold()) {
            this.flag = false;
            // System.out.println("small:" + node);
            return false;
        }
        return true;
    }

    void translateChild(PackNode node, PackNode parent, double k) {
        node.setR(node.getR() * k);
        if (parent != null) {
            node.setX(parent.getX() + k * node.getX());
            node.setY(parent.getY() + k * node.getY());
        }
    }

    void finishTail(PreparedStatement stmt) throws SQLException {
        int batchsize = Config.bboxBatchSize;
        if (this.rowCount % batchsize != 0) {
            stmt.executeBatch();
        }
        stmt.close();
        this.currTs = this.lastTs = (new Date()).getTime();
        this.rowCount = 0;
    }

    void packChildren(PackNode node, double padding, double k)
            throws ScriptException, NoSuchMethodException, SQLException {
        ArrayList<PackNode> children = (ArrayList<PackNode>) this.map.remove(node);
        double dr = padding * k;

        if (dr > 0)
            for (PackNode child : children) {
                child.setR(child.getR() + dr);
            }

        if (children == null) {
            System.out.println("MAP REMOVE WENT WRONG");
        } else {
            JSObject enclose = (JSObject) this.engine.invokeFunction("packSib", children);
            double e = (double) enclose.getMember("r");
            node.setR(dr + e);
        }

        for (PackNode child : children) {
            Boolean flag = false;
            if (dr > 0) child.setR(child.getR() - dr);
            if (this.status == 1) flag = this.insertPackNode(child);
            else if (this.status == 2) flag = this.updatePackNode(child);
        }

        // step 3: release the memory!
        children = null;
    }

    boolean updatePackNode(PackNode node) throws SQLException {

        double r = node.getR();
        double cx = node.getX();
        double cy = node.getY();
        int batchsize = Config.bboxBatchSize;

        this.updateStmt.setDouble(1, cx);
        this.updateStmt.setDouble(2, cy);
        this.updateStmt.setDouble(3, r);
        this.updateStmt.setInt(4, node.getId());
        this.updateStmt.addBatch();

        this.rowCount++;
        if (this.rowCount % batchsize == 0) {
            System.out.println(this.rowCount + " Rows!");
            this.updateStmt.executeBatch();
        }
        return true;
    }

    boolean insertPackNode(PackNode node) throws SQLException {

        double r = node.getR();
        double cx = node.getX();
        double cy = node.getY();
        int batchsize = Config.bboxBatchSize;

        this.insertStmt.setInt(1, node.getId());
        this.insertStmt.setString(2, node.getName());
        this.insertStmt.setInt(3, node.getParent());
        this.insertStmt.setDouble(4, node.getValue());
        this.insertStmt.setInt(5, node.getDepth());
        this.insertStmt.setInt(6, node.getHeight());
        this.insertStmt.setInt(7, node.getCount());
        this.insertStmt.setDouble(8, cx);
        this.insertStmt.setDouble(9, cy);
        this.insertStmt.setDouble(10, r);
        this.insertStmt.addBatch();

        this.rowCount++;
        if (this.rowCount % batchsize == 0) {
            System.out.println(this.rowCount + " Rows!");
            this.insertStmt.executeBatch();
        }
        return true;
    }

    boolean insertBBoxNode(PackNode node) throws SQLException {

        double r = node.getR();
        double cx = node.getX();
        double cy = node.getY();
        double x0 = cx - r;
        double x1 = cx + r;
        double y0 = cy - r;
        double y1 = cy + r;

        if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
        if (y1 < y0) y0 = y1 = (y0 + y1) / 2;

        x0 = Math.round(x0);
        y0 = Math.round(y0);
        x1 = Math.round(x1);
        y1 = Math.round(y1);
        cx = Math.round(cx);
        cy = Math.round(cy);
        r = Math.round(r);

        int batchsize = Config.bboxBatchSize;

        this.insertStmt.setInt(1, node.getId());
        this.insertStmt.setString(2, node.getName());
        this.insertStmt.setInt(3, node.getParent());
        this.insertStmt.setDouble(4, node.getValue());
        this.insertStmt.setInt(5, node.getDepth());
        this.insertStmt.setInt(6, node.getHeight());
        this.insertStmt.setInt(7, node.getCount());
        this.insertStmt.setDouble(8, cx);
        this.insertStmt.setDouble(9, cy);
        this.insertStmt.setDouble(10, 2 * r);
        this.insertStmt.setDouble(11, 2 * r);
        this.insertStmt.setDouble(12, cx);
        this.insertStmt.setDouble(13, cy);
        this.insertStmt.setDouble(14, x0);
        this.insertStmt.setDouble(15, y0);
        this.insertStmt.setDouble(16, x1);
        this.insertStmt.setDouble(17, y1);
        this.insertStmt.addBatch();

        this.rowCount++;
        if (this.rowCount % batchsize == 0) {
            System.out.println(this.rowCount + " Rows!");
            this.insertStmt.executeBatch();
        }
        return true;
    }

    protected String getPackTableName(CirclePacking h) {
        return "pack_" + Main.getProject().getName() + "_" + h.getName();
    }

    void createPackTable(CirclePacking h) throws SQLException, ClassNotFoundException {
        String hierTableName = this.getPackTableName(h);

        // drop table if exists
        Statement dropCreateStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String sql = "drop table if exists " + hierTableName + ";";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);

        // create the hierarchy table
        sql = "CREATE UNLOGGED TABLE " + hierTableName + " (";
        sql +=
                "id int, name text, parent int, value double precision, depth int, height int, count int, ";
        sql += "x double precision, y double precision, r double precision)";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);
        dropCreateStmt.close();

        // 10 cols: 7 node(id, name, parent...) + 3 pack(x, y, r)
        String insertSql = "INSERT INTO " + hierTableName + " VALUES (?,?,?,?,?,?,?,?,?,?)";
        System.out.println(insertSql);
        this.insertStmt = DbConnector.getPreparedStatement(Config.databaseName, insertSql);

        String updateSql =
                "UPDATE " + this.getPackTableName(h) + " SET x = ?, y = ?, r = ? where id = ?";
        this.updateStmt = DbConnector.getPreparedStatement(Config.databaseName, updateSql);
    }

    double getZoomCoef(Hierarchy h) {
        return Math.pow(h.getZoomFactor(), this.zoomLevel);
    }

    ArrayList<PackNode> getRawChildren(CirclePacking h, PackNode node)
            throws SQLException, ClassNotFoundException {
        ArrayList<PackNode> children = new ArrayList<>();
        String hierTableName = this.getHierarchyTableName(h);
        Statement getChildrenStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String getChildrenQuery =
                "select * from "
                        + hierTableName
                        + " where parent = '"
                        + node.getId()
                        + "' order by value desc";
        ResultSet rs = getChildrenStmt.executeQuery(getChildrenQuery);
        double lastV = 999999999;
        while (rs.next()) {
            int childId = rs.getInt(1);
            String childName = rs.getString(2);
            // System.out.println("a row was returned. ID: " + childId);
            double childV = rs.getDouble(4);
            if (childV > lastV) {
                System.out.println("Order wrong");
            }
            lastV = childV;
            int childH = rs.getInt(6);
            int childC = rs.getInt(7);
            PackNode child =
                    new PackNode(
                            new Node(
                                    childId,
                                    childName,
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

    ArrayList<PackNode> getPackChildren(CirclePacking h, PackNode node)
            throws SQLException, ClassNotFoundException {
        ArrayList<PackNode> children = new ArrayList<>();
        String packTableName = this.getPackTableName(h);
        Statement getChildrenStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String getChildrenQuery =
                "select * from "
                        + packTableName
                        + " where parent = '"
                        + node.getId()
                        + "' order by value desc";
        ResultSet rs = getChildrenStmt.executeQuery(getChildrenQuery);
        double lastV = 99999999;
        while (rs.next()) {
            int childId = rs.getInt(1);
            String childName = rs.getString(2);
            // System.out.println("a row was returned. ID: " + childId);
            double childV = rs.getDouble(3);
            if (childV > lastV) {
                System.out.println("Order wrong");
            }
            lastV = childV;
            int childH = rs.getInt(6);
            int childC = rs.getInt(7);
            double x = rs.getDouble(8);
            double y = rs.getDouble(9);
            double r = rs.getDouble(10);

            PackNode child =
                    new PackNode(
                            new Node(
                                    childId,
                                    childName,
                                    node.getId(),
                                    childV,
                                    node.getDepth() + 1,
                                    childH,
                                    childC),
                            x,
                            y,
                            r);
            children.add(child);
        }
        rs.close();
        return children;
    }
}
