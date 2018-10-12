package box;

import main.Config;
import main.DbConnector;
import main.Main;
import org.apache.hadoop.hbase.client.Result;
import org.apache.hadoop.hbase.client.ResultScanner;
import org.apache.hadoop.hbase.client.Scan;
import org.apache.hadoop.hbase.client.Table;
import org.apache.hadoop.hbase.util.Bytes;
import project.Canvas;
import project.Project;

import java.io.IOException;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;

public abstract class BoxGetter {

    private Project project;
    public BoxGetter() {
        project = Main.getProject();
    }

    public ArrayList<ArrayList<ArrayList<String>>> fetchData(Canvas c, int minx, int miny, int maxx, int maxy, ArrayList<String> predicates)
            throws SQLException, ClassNotFoundException {
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();
        Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);
        try {
            // loop through each layer
            for (int i = 0; i < c.getLayers().size(); i++) {

                if (c.getLayers().get(i).isStatic()) {
                    data.add(new ArrayList<>());
                    continue;
                }
                // construct range query
                String sql = "select * from bbox_" + project.getName() + "_"
                        + c.getId() + "layer" + i + " where ";
                sql += (Config.database == Config.Database.MYSQL ? "MBRIntersects(GeomFromText" :
                        "st_Intersects(st_GeomFromText") +
                        "('Polygon(("
                        + minx + " " + miny + "," + maxx + " " + miny
                        + "," + maxx + " " + maxy + "," + minx + " " + maxy
                        + "," + minx + " " + miny;
                sql += "))'),geom)";
                if (predicates.get(i).length() > 0)
                    sql += " and " + predicates.get(i);
                sql += ";";

                System.out.println(minx + " " + miny + " : " + sql);

                // add to response
                data.add(DbConnector.getQueryResult(stmt, sql));
            }
            stmt.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return data;
    }

    public ArrayList<ArrayList<ArrayList<String>>> fetchEEGData(int minx, int maxx, ArrayList<String> predicates)
            throws SQLException, ClassNotFoundException, IOException {

        // construct a data object and add a dummy array object for the label layer
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();
        data.add(new ArrayList<>());
        ArrayList<ArrayList<String>> eegData = new ArrayList<>();

        // get bigtable instance
        Table eegTable = Main.getEEGTable();
        String[] columnNames = {"c3", "c4", "cz", "ekg", "f3", "f4", "f7", "f8", "fp1",
                "fp2", "fz", "o1", "o2", "p3", "p4", "pz", "t3", "t4", "t5", "t6"};

        // calculate start & end key rows
        int startSegId = (int) Math.floor(minx / 200);
        int endSegId = (int) Math.floor(maxx / 200);
        String startRowKey = predicates.get(1) + "_" + String.format("%06d", startSegId);
        String endRowKey = predicates.get(1) + "_" + String.format("%06d", endSegId + 1);
        System.out.println(startRowKey + " " + endRowKey);

        // construct range query scanner
        Scan curScan = new Scan();
        curScan.withStartRow(Bytes.toBytes(startRowKey)).withStopRow(Bytes.toBytes(endRowKey));
        ResultScanner resultScanner = eegTable.getScanner(curScan);

        // iterate through results
        for (Result row : resultScanner) {
            String key = Bytes.toString(row.getRow());
            ArrayList<String> curData = new ArrayList<>();

            // key fields
            String[] keys = key.split("_");
            for (int i = 0; i < keys.length; i ++)
                curData.add(keys[i]);

            // channel data
            for (int i = 0; i < columnNames.length; i ++) {
                byte[] valueBytes = row.getValue(Bytes.toBytes("eeg"), Bytes.toBytes(columnNames[i]));
                String s = new String(valueBytes);
                curData.add(s);
            }

            //TODO: add bounding box data
            eegData.add(curData);
        }

        data.add(eegData);
        return data;
    }

    public abstract BoxandData getBox(Canvas c, int cx, int cy, int viewportH, int viewportW, ArrayList<String> predicates) throws SQLException, ClassNotFoundException, IOException;
}
