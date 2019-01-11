package box;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
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

    public ArrayList<ArrayList<ArrayList<String>>> fetchData(Canvas c, Box newBox, Box oldBox, ArrayList<String> predicates)
            throws SQLException, ClassNotFoundException, ParseException {
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();
        Statement stmt = DbConnector.getStmtByDbName(Config.databaseName);

        double newMinx = newBox.getMinx(), newMiny = newBox.getMiny();
        double newMaxx = newBox.getMaxx(), newMaxy = newBox.getMaxy();
        double oldMinx = oldBox.getMinx(), oldMiny = oldBox.getMiny();
        double oldMaxx = oldBox.getMaxx(), oldMaxy = oldBox.getMaxy();

        // loop through each layer
        for (int i = 0; i < c.getLayers().size(); i++) {

            if (c.getLayers().get(i).isStatic()) {
                data.add(new ArrayList<>());
                continue;
            }
            GeometryFactory fact = new GeometryFactory();
            WKTReader wktRdr = new WKTReader(fact);
            String wktNew = "POLYGON((" + newMinx + " " + newMiny + "," + newMinx + " " + newMaxy + ","
                    + newMaxx + " " + newMaxy + "," + newMaxx + " " + newMiny + "," + newMinx + " " + newMiny + "))";
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
            sql += "st_Intersects(st_GeomFromText";
            sql += "('" + deltaWkt + "'),geom)";
            if (predicates.get(i).length() > 0)
                sql += " and " + predicates.get(i);
            sql += ";";
            System.out.println(newMinx + " " + newMiny + " : " + sql);

            // add to response
            ArrayList<ArrayList<String>> curResults = DbConnector.getQueryResult(stmt, sql);
            for (int j = 0; j < curResults.size(); j ++)
                curResults.get(j).set(curResults.get(j).size() - 1, "");
            data.add(curResults);
        }
        stmt.close();

        return data;
    }

    public ArrayList<ArrayList<ArrayList<String>>> fetchEEGData(Canvas c, int minx, int maxx, Box oldBox, ArrayList<String> predicates)
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
        int newStart = minx, newEnd = maxx;
        int oldStart = oldBox.getMinx(), oldEnd = oldBox.getMaxx();
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
                ArrayList<String> curRow = new ArrayList<>();

                // key fields
                String[] keys = key.split("_");
                for (int i = 0; i < keys.length; i ++)
                    curRow.add(keys[i]);

                // channel data
                for (int i = 0; i < columnNames.length; i ++) {
                    byte[] valueBytes = row.getValue(Bytes.toBytes("eeg"), Bytes.toBytes(columnNames[i]));
                    String s = new String(valueBytes);
                    curRow.add(s);
                }

                // add bounding box data
                int bboxMinx = Integer.valueOf(keys[3]) * 200;
                int bboxMaxx = bboxMinx + 200;
                curRow.add(String.valueOf((bboxMinx + bboxMaxx) / 2));
                curRow.add("800");
                curRow.add(String.valueOf(bboxMinx));
                curRow.add("0");
                curRow.add(String.valueOf(bboxMaxx));
                curRow.add("1600");
                curRow.add("");

                // add this row to layer data
                eegData.add(curRow);
            }
        }

        // add data to response data
        data.add(eegData);
        return data;
    }

    public ArrayList<ArrayList<ArrayList<String>>> fetchSpectrogramData(Canvas c, int minx, int maxx, Box oldBox, ArrayList<String> predicates)
            throws SQLException, ClassNotFoundException, IOException {

        System.out.println("minx, maxx : " + minx + " " + maxx);
        int imageWidth = 450;

        // construct a data object (one layer for now)
        ArrayList<ArrayList<ArrayList<String>>> data = new ArrayList<>();
        ArrayList<ArrayList<String>> spectrogramData = new ArrayList<>();

        // calculate start & end key rows
        int newStart = minx, newEnd = maxx;
        int oldStart = oldBox.getMinx(), oldEnd = oldBox.getMaxx();
        oldStart = (int) Math.floor(oldStart / imageWidth);
        oldEnd = (int) Math.floor(oldEnd / imageWidth);
        newStart = (int) Math.floor(newStart / imageWidth);
        newEnd = (int) Math.floor(newEnd / imageWidth);

        if (! (newStart == oldStart && newEnd == oldEnd)) {

            if (oldEnd > newStart && oldEnd < newEnd)
                newStart = oldEnd + 1;
            else if (oldStart > newStart && oldStart < newEnd)
                newEnd = oldStart - 1;
            System.out.println("Fetching: " + newStart + " " + newEnd);

            // fetch images
            for (int i = newStart; i <= newEnd; i ++) {
                // The name of the bucket to access
                String bucketName = "spectrogram-images";

                // The name of the remote image to download
                String srcFilename = predicates.get(0) + "/15min/" + predicates.get(0) + "_15min_" + String.valueOf(i);
                String fileSuffix = ".jpg";

                // Instantiate a Google Cloud Storage client
                Storage storage = StorageOptions.getDefaultInstance().getService();

                // Get specific file from specified bucket
                Blob blob = storage.get(BlobId.of(bucketName, srcFilename + fileSuffix));
                if (blob != null) {
                    // add a data row
                    ArrayList<String> curRow = new ArrayList<>();
                    curRow.add(String.valueOf(i));
                    curRow.add("https://storage.googleapis.com/spectrogram-images/" +
                            srcFilename + fileSuffix);

                    // add bounding box data
                    int bboxMinx = i * imageWidth;
                    int bboxMaxx = bboxMinx + imageWidth;
                    curRow.add(String.valueOf((bboxMinx + bboxMaxx) / 2));
                    curRow.add("800");
                    curRow.add(String.valueOf(bboxMinx));
                    curRow.add("0");
                    curRow.add(String.valueOf(bboxMaxx));
                    curRow.add("1600");
                    curRow.add("");

                    // add data to layer data
                    spectrogramData.add(curRow);
                }
            }
        }
        // add data to response data
        data.add(spectrogramData);
        return data;
    }

    public abstract BoxandData getBox(Canvas c, int cx, int cy, Box oldBox, ArrayList<String> predicates) throws SQLException, ClassNotFoundException, IOException, ParseException;
}
