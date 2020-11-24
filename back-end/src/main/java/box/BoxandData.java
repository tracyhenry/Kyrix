package box;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import project.Canvas;
import project.Layer;

public class BoxandData {
    public Box box;
    public ArrayList<ArrayList<ArrayList<String>>> data;

    public BoxandData(Box box, ArrayList<ArrayList<ArrayList<String>>> data) {

        this.box = box;
        this.data = data;
    }

    // Render data used to be stored in a three-dimenson array (layer, row, field).
    // To enable writing rendering functions using field names,
    // we convert it to an array of arrays of dictionaries (hashMap in Java)
    public static ArrayList<ArrayList<HashMap<String, String>>> getDictionaryFromData(
            ArrayList<ArrayList<ArrayList<String>>> data, Canvas c)
            throws SQLException, ClassNotFoundException {

        ArrayList<ArrayList<HashMap<String, String>>> ret = new ArrayList<>();
        int numLayers = data.size();
        for (int i = 0; i < numLayers; i++) {
            ret.add(new ArrayList<>());
            int numRows = data.get(i).size();
            Layer curLayer = c.getLayers().get(i);
            ArrayList<String> fields = curLayer.getTransform().getColumnNames();

            for (int j = 0; j < numRows; j++) {
                int numFields = fields.size();
                // raw data fields
                ArrayList<String> rowArray = data.get(i).get(j);
                HashMap<String, String> rowDict = new HashMap<>();
                for (int k = 0; k < numFields; k++) rowDict.put(fields.get(k), rowArray.get(k));

                // cluster number field for ssv layer
                if (curLayer.getIndexerType().contains("SSV")) {
                    rowDict.put("clusterAgg", rowArray.get(numFields));
                    numFields++;
                }

                // bounding box fields,
                // need to check if rowArray has cx, cy, minx, ..
                // since the introduction of StaticAggregationIndexer
                // which does generate cx, cy, minx...
                rowDict.put("cx", numFields >= rowArray.size() ? "0" : rowArray.get(numFields));
                rowDict.put(
                        "cy", numFields + 1 >= rowArray.size() ? "0" : rowArray.get(numFields + 1));
                rowDict.put(
                        "minx",
                        numFields + 2 >= rowArray.size() ? "0" : rowArray.get(numFields + 2));
                rowDict.put(
                        "miny",
                        numFields + 3 >= rowArray.size() ? "0" : rowArray.get(numFields + 3));
                rowDict.put(
                        "maxx",
                        numFields + 4 >= rowArray.size() ? "0" : rowArray.get(numFields + 4));
                rowDict.put(
                        "maxy",
                        numFields + 5 >= rowArray.size() ? "0" : rowArray.get(numFields + 5));
                ret.get(i).add(rowDict);
            }
        }
        return ret;
    }
}
