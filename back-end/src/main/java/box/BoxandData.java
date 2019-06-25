package box;

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
            ArrayList<ArrayList<ArrayList<String>>> data, Canvas c) {

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

                // cluster number field for autodd layer
                if (curLayer.isAutoDDLayer()) {
                    rowDict.put("cluster_num", rowArray.get(numFields));
                    numFields++;
                }

                // bounding box fields
                rowDict.put("cx", rowArray.get(numFields));
                rowDict.put("cy", rowArray.get(numFields + 1));
                rowDict.put("minx", rowArray.get(numFields + 2));
                rowDict.put("miny", rowArray.get(numFields + 3));
                rowDict.put("maxx", rowArray.get(numFields + 4));
                rowDict.put("maxy", rowArray.get(numFields + 5));
                ret.get(i).add(rowDict);
            }
        }
        return ret;
    }
}
