package project;

import java.util.ArrayList;

/** Created by xinli on 8/15/19. */
public class Table {
    private String query, db, table, name;
    private double x, y, cell_height, heads_height, sum_width;
    private ArrayList<String> schema, group_by;

    public String getDb() {
        return db;
    }

    public String getName() {
        return name;
    }

    public String getQuery() {
        return query;
    }

    public String getTable() {
        return table;
    }

    public double getX() {
        return x;
    }

    public double getY() {
        return y;
    }

    public double getCellHeight() {
        return cell_height;
    }

    public double getSumWidth() {
        return sum_width;
    }

    public double getHeadsHeight() {
        return heads_height;
    }

    public ArrayList<String> getSchema() {
        return schema;
    }

    public ArrayList<String> getPredCols() {
        return group_by;
    }
}
