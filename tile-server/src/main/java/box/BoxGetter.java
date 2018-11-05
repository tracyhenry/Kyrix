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
import org.locationtech.jts.geom.*;
import org.locationtech.jts.io.*;

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
            throws SQLException, ClassNotFoundException, ParseException {
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();
        Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);

        int oldMinx, oldMiny, oldMaxx, oldMaxy;
        if (History.getCanvas() == null || ! History.getCanvas().getId().equals(c.getId())) {
            oldMinx = oldMaxx = oldMiny = oldMaxy = Integer.MIN_VALUE;
            History.reset();
        } else {
            oldMinx = History.box.getMinx();
            oldMiny = History.box.getMiny();
            oldMaxx = History.box.getMaxx();
            oldMaxy = History.box.getMaxy();
        }
        // loop through each layer
        for (int i = 0; i < c.getLayers().size(); i++) {

            if (c.getLayers().get(i).isStatic()) {
                data.add(new ArrayList<>());
                continue;
            }
            GeometryFactory fact = new GeometryFactory();
            WKTReader wktRdr = new WKTReader(fact);
            String wktNew = "POLYGON((" + minx + " " + miny + "," +minx + " " + maxy + ","
                    + maxx + " " + maxy + "," + maxx + " " + miny + "," + minx + " " + miny + "))";
            String wktOld = "POLYGON((" + oldMinx + " " + oldMiny + "," +oldMinx + " " + oldMaxy + ","
                    + oldMaxx + " " + oldMaxy + "," + oldMaxx + " " + oldMiny + "," + oldMinx + " " + oldMiny + "))";
            Geometry newBoxGeom = wktRdr.read(wktNew);
            Geometry oldBoxGeom = wktRdr.read(wktOld);
            Geometry deltaGeom = newBoxGeom.difference(oldBoxGeom);
            WKTWriter wktWtr = new WKTWriter();
            String deltaWkt = wktWtr.write(deltaGeom);

            // construct range query
            String sql = "select * from bbox_" + project.getName() + "_"
                    + c.getId() + "layer" + i + " where ";
            sql += (Config.database == Config.Database.MYSQL ? "MBRIntersects(GeomFromText" :
                    "st_Intersects(st_GeomFromText");
            sql += "('" + deltaWkt + "'),geom)";
            if (predicates.get(i).length() > 0)
                sql += " and " + predicates.get(i);
            sql += ";";
            System.out.println(minx + " " + miny + " : " + sql);

            // add to response
            data.add(DbConnector.getQueryResult(stmt, sql));
        }
        History.updateHistory(c, new Box(minx, miny, maxx, maxy), 0);
        stmt.close();

        return data;
    }

    public ArrayList<ArrayList<ArrayList<String>>> fetchEEGData(Canvas c, int minx, int maxx, ArrayList<String> predicates)
            throws SQLException, ClassNotFoundException, IOException {

        System.out.println("minx, maxx : " + minx + " " + maxx);

        // construct a data object and add a dummy array object for the label layer
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();
        data.add(new ArrayList<>());
        ArrayList<ArrayList<String>> eegData = new ArrayList<>();

        // get bigtable instance
        Table eegTable = Main.getEEGTable();
        String[] columnNames = {"c3", "c4", "cz", "ekg", "f3", "f4", "f7", "f8", "fp1",
                "fp2", "fz", "o1", "o2", "p3", "p4", "pz", "t3", "t4", "t5", "t6"};

        // calculate start & end key rows
        int oldStart, oldEnd, newStart = minx, newEnd = maxx;
        if (History.getCanvas() == null || ! History.getCanvas().getId().equals(c.getId())) {
            oldStart = oldEnd = Integer.MIN_VALUE;
            History.reset();
        } else {
            oldStart = History.box.getMinx();
            oldEnd = History.box.getMaxx();
        }
        History.updateHistory(c, new Box(newStart, 0, newEnd, 0), 0);

        oldStart = (int) Math.floor(oldStart / 200);
        oldEnd = (int) Math.floor(oldEnd / 200);
        newStart = (int) Math.floor(newStart / 200);
        newEnd = (int) Math.floor(newEnd / 200);

        if (! (newStart == oldStart && newEnd == oldEnd)) {

            if (oldEnd > newStart && oldEnd < newEnd)
                newStart = oldEnd + 1;
            else if (oldStart > newStart && oldStart < newEnd)
                newEnd = oldStart - 1;
            System.out.println("Fetching: " + newStart + " " + newEnd);
            String startRowKey = predicates.get(1) + "_" + String.format("%06d", newStart);
            String endRowKey = predicates.get(1) + "_" + String.format("%06d", newEnd + 1);
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
        }
        data.add(eegData);
        return data;
    }

    public ArrayList<ArrayList<ArrayList<String>>> fetchSpectrumData(int minx, int maxx, ArrayList<String> predicates)
            throws SQLException, ClassNotFoundException, IOException {

        System.out.println("minx, maxx : " + minx + " " + maxx);

        // construct a data object and add a dummy array object for the label layer
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();
        //data.add(new ArrayList<>());
        ArrayList<ArrayList<String>> spectrumData = new ArrayList<>();

        // get bigtable instance
        Table spectrumTable = Main.getSpectrumTable();
        String[] columnNames = {"LL","LP","RL","RP"};

        // calculate start & end key rows
        String startRowKey = predicates.get(0);
        String[] topredicates = predicates.get(0).split("_");
        String endRowKey = topredicates[0] + "_" + topredicates[1] + "_" + topredicates[2] + "_" + String.format("%06d", maxx + 1);
        System.out.println(startRowKey + " " + endRowKey);

        // construct range query scanner
        Scan curScan = new Scan();
        curScan.withStartRow(Bytes.toBytes(startRowKey)).withStopRow(Bytes.toBytes(endRowKey));
        ResultScanner resultScanner = spectrumTable.getScanner(curScan);

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
                byte[] valueBytes = row.getValue(Bytes.toBytes("freq"), Bytes.toBytes(columnNames[i]));
                String s = new String(valueBytes);
                curData.add(s);
            }

            //TODO: add bounding box data
            spectrumData.add(curData);
        }
        data.add(spectrumData);
        return data;
    }
    public abstract BoxandData getBox(Canvas c, int cx, int cy, int viewportH, int viewportW, ArrayList<String> predicates) throws SQLException, ClassNotFoundException, IOException, ParseException;
}
