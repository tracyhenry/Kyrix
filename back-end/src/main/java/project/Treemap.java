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

    private int rowCount;
    private PreparedStatement insertStmt;

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
    public void calcLayout(int pyramidLevel, String bboxTableName, Node rootNode)
            throws SQLException, ClassNotFoundException {
        super.calcLayout(pyramidLevel, bboxTableName, rootNode);
        System.out.println("level: " + pyramidLevel + "class: " + this.getClass().getName());
        String hierTableName = "hierarchy_" + Main.getProject().getName() + "_" + getName();

        // prepare the preparedstatement
        // 11 cols: 5(id, parent, etc.) + 6(cx, cy, etc.)
        String insertSql = "INSERT INTO " + bboxTableName + " VALUES (?,?,?,?,?,?,?,?,?,?,?)";
        System.out.println(insertSql);
        this.insertStmt = DbConnector.getPreparedStatement(Config.databaseName, insertSql);
        rowCount = 0;

        double zoomFactor = Math.pow(this.getZoomFactor(), pyramidLevel);
        // prepare the root node for the calculation
        TreemapNode root = new TreemapNode(rootNode);
        root.x0 = x * zoomFactor;
        root.x1 = (x + width) * zoomFactor;
        root.y0 = y * zoomFactor;
        root.y1 = (y + height) * zoomFactor;
        Stack<TreemapNode> stack = new Stack<>();
        stack.push(root);
        TreemapNode node = root;
        while (!stack.empty()) {
            node = stack.pop();
            // the stack is sent to get pushed
            positionNode(node, stack);
            // System.out.println("stack:" +  stack);

        }

        // finish up on the tail nodes
        int batchsize = Config.bboxBatchSize;
        if (this.rowCount % batchsize != 0) {
            insertStmt.executeBatch();
        }
        insertStmt.close();
    }

    public void positionNode(TreemapNode node, Stack<TreemapNode> stack)
            throws SQLException, ClassNotFoundException {
        // step 1: take care of the node itself
        double p = paddingInner / 2;
        double x0 = node.x0 + p;
        double y0 = node.y0 + p;
        double x1 = node.x1 - p;
        double y1 = node.y1 - p;

        if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
        if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
        node.x0 = Math.round(x0);
        node.y0 = Math.round(y0);
        node.x1 = Math.round(x1);
        node.y1 = Math.round(y1);

        // add the node to the database
        insertNode(node);

        // create the list for children
        ArrayList<TreemapNode> children = new ArrayList<>();
        if (node.height != 0) {
            String hierTableName = "hierarchy_" + Main.getProject().getName() + "_" + getName();
            Statement getChildrenStmt = DbConnector.getStmtByDbName(Config.databaseName);
            String getChildrenQuery =
                    "select * from " + hierTableName + " where parent = '" + node.getId() + "'";
            ResultSet rs = getChildrenStmt.executeQuery(getChildrenQuery);
            while (rs.next()) {
                String childId = rs.getString(1);
                // System.out.println("a row was returned. ID: " + childId);
                double childV = rs.getDouble(3);
                TreemapNode child =
                        new TreemapNode(
                                new Node(
                                        childId,
                                        node.getId(),
                                        childV,
                                        node.getDepth() + 1,
                                        node.getHeight() - 1));
                stack.push(child);
                children.add(child);
            }
            rs.close();

            x0 += paddingLeft - p;
            y0 += paddingTop - p;
            x1 -= paddingRight - p;
            y1 -= paddingBottom - p;
            if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
            if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
            tile(node, children, x0, x1, y0, y1);
        }
    }

    private void tile(
            TreemapNode node,
            ArrayList<TreemapNode> children,
            double x0,
            double x1,
            double y0,
            double y1) {
        int i0 = 0, i1 = 0, n = children.size();
        double value = node.value,
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
            do sumValue = children.get(i1++).value;
            while (sumValue <= 0 && i1 < n);
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
            double x1,
            double y0,
            double y1) {
        // var children = parent.children,
        TreemapNode node;
        int i = -1;
        int n = children.size();
        double k = parent.getValue() == 0 ? parent.getValue() : (x1 - x0) / parent.getValue();

        while (++i < n) {
            node = children.get(i);
            node.y0 = y0;
            node.y1 = y1;
            node.x0 = x0;
            x0 += (node.getValue() * k);
            node.x1 = x0;
        }
    }

    private void slice(
            TreemapNode parent,
            List<TreemapNode> children,
            double x0,
            double x1,
            double y0,
            double y1) {
        // var children = parent.children,
        TreemapNode node;
        int i = -1;
        int n = children.size();
        double k = parent.getValue() == 0 ? parent.getValue() : (y1 - y0) / parent.getValue();

        while (++i < n) {
            node = children.get(i);
            node.x0 = x0;
            node.x1 = x1;
            node.y0 = y0;
            y0 += (node.getValue() * k);
            node.y1 = y0;
        }
    }

    private void insertNode(TreemapNode node) throws SQLException {
        int batchsize = Config.bboxBatchSize;
        double cx = (node.x0 + node.x1) / 2;
        double cy = (node.y0 + node.y1) / 2;
        insertStmt.setString(1, node.getId());
        insertStmt.setString(2, node.getParent());
        insertStmt.setDouble(3, node.getValue());
        insertStmt.setInt(4, node.getDepth());
        insertStmt.setInt(5, node.getHeight());
        insertStmt.setDouble(6, cx);
        insertStmt.setDouble(7, cy);
        insertStmt.setDouble(8, node.getx0());
        insertStmt.setDouble(9, node.gety0());
        insertStmt.setDouble(10, node.getx1());
        insertStmt.setDouble(11, node.gety1());
        insertStmt.addBatch();

        rowCount++;
        if (rowCount % batchsize == 0) {
            System.out.println(rowCount + " Rows! Stack ");
            insertStmt.executeBatch();
        }
    }

    class TreemapNode extends Node {
        private double x0;
        private double y0;
        private double x1;
        private double y1;

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
    }
}
