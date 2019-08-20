package index;

import java.io.*;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.function.*;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Hierarchy;
import project.Layer;

public class PsqlNestedJsonIndexer extends PsqlNativeBoxIndexer {

    private static PsqlNestedJsonIndexer instance = null;

    // thread-safe instance getter
    public static synchronized PsqlNestedJsonIndexer getInstance() {

        if (instance == null) instance = new PsqlNestedJsonIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {

        Layer l = c.getLayers().get(layerId);
        // Transform trans = l.getTransform();
        // HashMap<String, Integer> hashMap = new HashMap<>();

        String[] cids = c.getId().split("_");

        if (cids[2].equals("")) return;
        if (Integer.parseInt(cids[2]) > 0 || l.isRetainSizeZoom()) return;

        // this is used to find the correct hierarchy
        String hid = c.getId().split("_")[1];
        Hierarchy h = null;
        ArrayList<Hierarchy> hierarchies = Main.getProject().getHierarchies();
        for (Hierarchy hierarchy : hierarchies) {
            h = hierarchy;
            if (hid.equals(h.getName().split("_")[1])) {
                System.out.println("hierarchy name:" + h.getName());
                break;
            }
        }
        assert h != null;
        String filepath = h.getFilepath();
        String fieldChildren = h.getChildren();
        String fieldId = h.getId();
        System.out.println("hierarchy filepath:" + filepath);

        // step 0: create tables for storing bboxes and tiles
        String bboxTableName =
                "bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;

        // drop table if exists
        Statement dropCreateStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String sql = "drop table if exists " + bboxTableName + ";";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);

        // create the bbox table
        // yes, citus supports unlogged tables!
        // http://docs.citusdata.com/en/v8.1/performance/performance_tuning.html#postgresql-tuning
        sql = "CREATE UNLOGGED TABLE " + bboxTableName + " (";
        // for (int i = 0; i < trans.getColumnNames().size(); i++)
        // sql += trans.getColumnNames().get(i) + " text, ";
        sql += "id string, parent string, value double precision, depth int, height int, ";
        sql +=
                "cx double precision, cy double precision, minx double precision, miny double precision, maxx double precision, maxy double precision, geom box)";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);
        dropCreateStmt.close();

        // not streaming
        // BufferedReader reader = new BufferedReader(new FileReader(filepath));
        // Gson gson = new GsonBuilder().create();
        // Node root = gson.fromJson(reader, Node.class);
        // System.out.println("hierarchy filepath:" + root);

    }
}
