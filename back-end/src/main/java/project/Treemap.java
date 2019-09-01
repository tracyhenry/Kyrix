package project;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Stack;
import main.Config;
import main.DbConnector;
import main.Main;
import server.Exclude;

public class Treemap extends Hierarchy {

    private double height;
    private double width;
    private double x;
    private double y;

    private double ratio;
    private double paddingInner;
    private double paddingTop;
    private double paddingLeft;
    private double paddingBottom;
    private double paddingRight;

    private double paddingExponent;
    private double paddingCoef;

    @Exclude private int rowCount;
    @Exclude private PreparedStatement insertStmt;
    @Exclude private String bboxTableName;
    @Exclude private int zoomLevel;
    @Exclude private Boolean flag;

    public void setRatio(double ratio) {
        this.ratio = ratio;
    }

    public double getRatio() {
        return ratio;
    }

    public void setPaddingBottom(double paddingBottom) {
        this.paddingBottom = paddingBottom;
    }

    public double getPaddingBottom() {
        return paddingBottom;
    }

    public void setPaddingLeft(double paddingLeft) {
        this.paddingLeft = paddingLeft;
    }

    public double getPaddingLeft() {
        return paddingLeft;
    }

    public void setPaddingRight(double paddingRight) {
        this.paddingRight = paddingRight;
    }

    public double getPaddingRight() {
        return paddingRight;
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

    public void setPaddingTop(double paddingTop) {
        this.paddingTop = paddingTop;
    }

    public double getPaddingTop() {
        return paddingTop;
    }

    public void setPaddingInner(double paddingInner) {
        this.paddingInner = paddingInner;
    }

    public double getPaddingInner() {
        return paddingInner;
    }

    @Override
    public String toString() {
        return "Treemap{"
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
    public void calcLayout(int zoomLevel, String bboxTableName, Node rootNode)
            throws SQLException, ClassNotFoundException {
        super.calcLayout(zoomLevel, bboxTableName, rootNode);
        String hierTableName = "hierarchy_" + Main.getProject().getName() + "_" + getName();
        this.bboxTableName = bboxTableName;
        this.zoomLevel = zoomLevel;
        this.flag = true;

        // prepare the preparedstatement
        // 15 cols: 5(id, parent, etc.) + 4(x, y, w, h) + 6(cx, cy, etc.)
        String insertSql =
                "INSERT INTO " + bboxTableName + " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
        System.out.println(insertSql);
        this.insertStmt = DbConnector.getPreparedStatement(Config.databaseName, insertSql);
        rowCount = 0;

        double zoomFactor = Math.pow(this.getZoomFactor(), zoomLevel);
        System.out.println(
                " level: "
                        + zoomLevel
                        + " class: "
                        + this.getClass().getName()
                        + " zoomFactor: "
                        + zoomFactor);
        // prepare the root node for the calculation
        TreemapNode root = new TreemapNode(rootNode);
        root.x0 = x * zoomFactor;
        root.x1 = (x + width) * zoomFactor;
        root.y0 = y * zoomFactor;
        root.y1 = (y + height) * zoomFactor;
        double inf = Double.POSITIVE_INFINITY;
        root.parentX0 = 0;
        root.realX0 = -inf;
        root.parentY0 = 0;
        root.realY0 = -inf;
        root.parentX1 = 0;
        root.realX1 = inf;
        root.parentY1 = 0;
        root.realY1 = inf;

        Stack<TreemapNode> stack = new Stack<>();
        stack.push(root);

        TreemapNode node = root;
        while (!stack.empty()) {
            node = stack.pop();
            // the stack is sent to get pushed
            positionNode(node, stack, zoomFactor);
        }

        // finish up on the tail nodes
        int batchsize = Config.bboxBatchSize;
        if (this.rowCount % batchsize != 0) {
            insertStmt.executeBatch();
        }
        insertStmt.close();
        if (!flag) System.out.println("Some nodes are too small");
        else System.out.println("All nodes are big enough");
    }

    public void positionNode(TreemapNode node, Stack<TreemapNode> stack, double zoomFactor)
            throws SQLException, ClassNotFoundException {

        // step 1: take care of the node itself
        double x0 = node.x0;
        double y0 = node.y0;
        double x1 = node.x1;
        double y1 = node.y1;

        Boolean flag = insertNode(node, stack);
        if (!flag) return;

        // step 2: create the list for children
        ArrayList<TreemapNode> children = new ArrayList<>();
        if (node.height > 0) {
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
                TreemapNode child =
                        new TreemapNode(
                                new Node(
                                        childId,
                                        node.getId(),
                                        childV,
                                        node.getDepth() + 1,
                                        childH));
                stack.push(child);
                children.add(child);
            }
            rs.close();

            if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
            if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
            // step 3: tile!
            tile(node, children, x0, y0, x1, y1);
        }
    }

    private void tile(
            TreemapNode parent,
            ArrayList<TreemapNode> children,
            double x0,
            double y0,
            double x1,
            double y1) {
        int i0 = 0, i1 = 0, n = children.size();
        double value = parent.value,
                sumValue = 0,
                dx,
                dy,
                minValue,
                maxValue,
                alpha,
                beta,
                minRatio,
                newRatio,
                nodeValue;
        TreemapNode row = new TreemapNode();
        while (i0 < n) {
            dx = x1 - x0;
            dy = y1 - y0;

            // Find the next non-empty node.
            do {
                sumValue = children.get(i1++).value;
            } while (sumValue <= 0 && i1 < n);
            minValue = maxValue = sumValue;
            alpha = Math.max(dy / dx, dx / dy) / (value * ratio);
            beta = sumValue * sumValue * alpha;
            minRatio = Math.max(maxValue / beta, beta / minValue);

            // Keep adding nodes while the aspect ratio maintains or improves.
            for (; i1 < n; ++i1) {
                sumValue += nodeValue = children.get(i1).value;
                if (nodeValue < minValue) minValue = nodeValue;
                if (nodeValue > maxValue) maxValue = nodeValue;
                beta = sumValue * sumValue * alpha;
                newRatio = Math.max(maxValue / beta, beta / minValue);
                if (newRatio > minRatio) {
                    sumValue -= nodeValue;
                    break;
                }
                minRatio = newRatio;
            }

            // Position and record the row orientation.
            row.setValue(sumValue);
            // this is hack
            row.sety0(parent.y0);
            row.setx0(parent.x0);
            row.setx1(parent.x1);
            row.sety1(parent.y1);
            row.realX0 = parent.realX0;
            row.realY0 = parent.realY0;
            row.realX1 = parent.realX1;
            row.realY1 = parent.realY1;
            // row.setParentY0(parent.parentY0);
            Boolean flag = dx < dy;
            List<TreemapNode> sublist = children.subList(i0, i1);
            // rows.push(row = {value: sumValue, dice: dx < dy, children: nodes.slice(i0, i1)});
            if (flag) dice(row, sublist, x0, y0, x1, value != 0 ? y0 += dy * sumValue / value : y1);
            else slice(row, sublist, x0, y0, value != 0 ? x0 += dx * sumValue / value : x1, y1);
            value -= sumValue;
            i0 = i1;
        }
    }

    private void dice(
            TreemapNode parent,
            List<TreemapNode> children,
            double x0,
            double y0,
            double x1,
            double y1) {

        TreemapNode node;
        int i = -1;
        int n = children.size();
        double k = 0;
        if (parent.getValue() != 0 && (x1 - x0) / parent.getValue() != 0) {
            k = (x1 - x0) / parent.getValue();
        }

        while (++i < n) {
            node = children.get(i);
            node.y0 = y0;
            node.y1 = y1;
            node.x0 = x0;
            x0 += (node.getValue() * k);
            node.x1 = x0;
            node.realY0 = parent.realY0;
            node.parentY0 = parent.y0;
            node.realX0 = parent.realX0;
            node.parentX0 = parent.x0;
            node.realX1 = parent.realX1;
            node.parentX1 = parent.x1;
            node.realY1 = parent.realY1;
            node.parentY1 = parent.y1;
        }
    }

    private void slice(
            TreemapNode parent,
            List<TreemapNode> children,
            double x0,
            double y0,
            double x1,
            double y1) {

        TreemapNode node;
        int i = -1;
        int n = children.size();
        double k = 0;
        if (parent.getValue() != 0 && (y1 - y0) / parent.getValue() != 0) {
            k = (y1 - y0) / parent.getValue();
        }

        while (++i < n) {
            node = children.get(i);
            node.x0 = x0;
            node.x1 = x1;
            node.y0 = y0;
            y0 += (node.getValue() * k);
            node.y1 = y0;
            node.realY0 = parent.realY0;
            node.parentY0 = parent.y0;
            node.realX0 = parent.realX0;
            node.parentX0 = parent.x0;
            node.realX1 = parent.realX1;
            node.parentX1 = parent.x1;
            node.realY1 = parent.realY1;
            node.parentY1 = parent.y1;
        }
    }

    private Boolean insertNode(TreemapNode node, Stack<TreemapNode> stack)
            throws SQLException, ClassNotFoundException {

        double x0 = node.getx0();
        double y0 = node.gety0();
        double x1 = node.getx1();
        double y1 = node.gety1();
        int depth = node.getDepth();

        double k = Math.max(1, paddingCoef * Math.pow(zoomLevel, paddingExponent));
        double p = paddingInner / 2;

        double supposedY0 = y0 + node.realY0 + k * paddingTop - node.parentY0;
        double supposedX0 = x0 + node.realX0 + k * paddingLeft - node.parentX0;
        double supposedX1 = x1 + node.realX1 - k * paddingRight - node.parentX1;
        double supposedY1 = y1 + node.realY1 - k * paddingBottom - node.parentY1;
        // if(node.parent.equals("AA") )
        //     System.out.println("before:" + node);
        if (y0 <= node.realY0 + k * paddingTop) {
            y0 = supposedY0;
            // if(node.parent.equals("AA") )
            //     System.out.println(node + "adjustment made here, y0:" + y0 + " paddingTop: " +
            // paddingTop);
        }
        if (x0 <= node.realX0 + k * paddingLeft) {
            x0 = supposedX0;
        }
        if (x1 >= node.realX1 - k * paddingRight) {
            x1 = supposedX1;
        }
        if (y1 >= node.realY1 - k * paddingBottom) {
            y1 = supposedY1;
        }

        x0 += k * p;
        x1 -= k * p;
        y0 += k * p;
        y1 -= k * p;

        // double supposedY0 = y0 + node.realY0 + paddingTop - node.parentY0 - p;
        // double supposedX0 = x0 + node.realX0 + paddingLeft - node.parentX0 - p;
        // double supposedX1 = x1 + node.realX1 - paddingRight - node.parentX1 + p;
        // double supposedY1 = y1 + node.realY1 - paddingBottom - node.parentY1 + p;
        // if (y0 <= node.realY0 + paddingTop ){
        //     y0 = supposedY0;
        // }
        // if (x0 <= node.realX0 + paddingLeft ){
        //     x0 = supposedX0;
        // }
        // if (x1 >= node.realX1 - paddingRight ){
        //     x1 = supposedX1;
        // }
        // if (y1 >= node.realY1 - paddingBottom ){
        //     y1 = supposedY1;
        // }

        // x0 += p;
        // x1 -= p;
        // y0 += p;
        // y1 -= p;

        if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
        if (y1 < y0) y0 = y1 = (y0 + y1) / 2;

        x0 = Math.round(x0);
        y0 = Math.round(y0);
        x1 = Math.round(x1);
        y1 = Math.round(y1);

        node.realX0 = x0;
        node.realY0 = y0;
        node.realX1 = x1;
        node.realY1 = y1;

        // add the node to the database
        double w = x1 - x0;
        double h = y1 - y0;
        if (Math.log(w) + Math.log(h) < 6.5) {
            this.flag = false;
            return false;
        }

        int batchsize = Config.bboxBatchSize;
        double cy = (y0 + y1) / 2;
        double cx = (x0 + x1) / 2;

        insertStmt.setString(1, node.getId());
        insertStmt.setString(2, node.getParent());
        insertStmt.setDouble(3, node.getValue());
        insertStmt.setInt(4, node.getDepth());
        insertStmt.setInt(5, node.getHeight());
        insertStmt.setDouble(6, cx);
        insertStmt.setDouble(7, cy);
        insertStmt.setDouble(8, w);
        insertStmt.setDouble(9, h);
        insertStmt.setDouble(10, cx);
        insertStmt.setDouble(11, cy);
        insertStmt.setDouble(12, x0);
        insertStmt.setDouble(13, y0);
        insertStmt.setDouble(14, x1);
        insertStmt.setDouble(15, y1);
        insertStmt.addBatch();

        rowCount++;
        if (rowCount % batchsize == 0) {
            System.out.println(rowCount + " Rows!");
            System.out.println("stack: " + stack);
            insertStmt.executeBatch();
        }
        return true;
    }

    class TreemapNode extends Node {
        private double x0;
        private double y0;
        private double x1;
        private double y1;

        private double realX0;
        private double parentX0;
        private double realY0;
        private double parentY0;
        private double realX1;
        private double parentX1;
        private double realY1;
        private double parentY1;

        public void setParentY0(double parentY0) {
            this.parentY0 = parentY0;
        }

        public double getParentY0() {
            return parentY0;
        }

        public void setRealY0(double realY0) {
            this.realY0 = realY0;
        }

        public double getRealY0() {
            return realY0;
        }

        TreemapNode(Node node) {
            super(node);
            x0 = 0;
            x1 = 0;
            y0 = 0;
            y1 = 0;
        }

        TreemapNode() {}

        public void setx0(double x0) {
            this.x0 = x0;
        }

        public double getx0() {
            return x0;
        }

        public void sety0(double y0) {
            this.y0 = y0;
        }

        public double gety0() {
            return y0;
        }

        public void setx1(double x1) {
            this.x1 = x1;
        }

        public double getx1() {
            return x1;
        }

        public void sety1(double y1) {
            this.y1 = y1;
        }

        public double gety1() {
            return y1;
        }

        @Override
        public String toString() {
            String nodestr = super.toString();
            nodestr +=
                    "placement{("
                            + x0
                            + ","
                            + y0
                            + "),("
                            + x1
                            + ","
                            + y1
                            + ")\n"
                            + " realX0: "
                            + realX0
                            + " parentX0: "
                            + parentX0
                            + " realX1: "
                            + realX1
                            + " parentX1: "
                            + parentX1
                            + " realY0: "
                            + realY0
                            + " parentY0: "
                            + parentY0
                            + " realY1: "
                            + realY1
                            + " parentY1: "
                            + parentY1
                            + "};\n";
            return nodestr;
        }
    }
}
