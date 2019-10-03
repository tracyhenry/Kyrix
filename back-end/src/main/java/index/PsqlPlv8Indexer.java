package index;

import java.sql.SQLException;
import java.sql.Statement;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Layer;
import project.Transform;

/** Created by wenbo on 9/30/19. */
public class PsqlPlv8Indexer extends PsqlNativeBoxIndexer {

    private static PsqlPlv8Indexer instance = null;

    private PsqlPlv8Indexer() {}

    // thread-safe instance getter
    public static synchronized PsqlPlv8Indexer getInstance() {

        if (instance == null) instance = new PsqlPlv8Indexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws SQLException, ClassNotFoundException {

        Statement bboxStmt = DbConnector.getStmtByDbName(Config.databaseName);
        Layer l = c.getLayers().get(layerId);
        Transform trans = l.getTransform();

        // drop bbox table if exists
        String bboxTableName =
                "bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;
        String sql = "drop table if exists " + bboxTableName + ";";
        System.out.println(sql);
        bboxStmt.executeUpdate(sql);

        // create bbox table
        sql = "CREATE UNLOGGED TABLE " + bboxTableName + " (";
        for (int i = 0; i < trans.getColumnNames().size(); i++)
            sql += trans.getColumnNames().get(i) + " text, ";
        sql +=
                "cx double precision, cy double precision, minx double precision, miny double precision, maxx double precision, maxy double precision, geom box)";
        System.out.println(sql);
        bboxStmt.executeUpdate(sql);
        bboxStmt.close();

        // if this is an empty layer, return
        if (trans.getDb().equals("")) return;

        // check that raw data is in kyrix db
        if (!trans.getDb().equals(Config.databaseName))
            throw new IllegalArgumentException(
                    "To use the Plv8 indexer, raw data must be in the **"
                            + Config.database
                            + "** database.");

        // create trans && bbox functions
        String transFuncName = bboxTableName + "_transform_func";
        String bboxFuncName = bboxTableName + "_bbox_func";
        bboxStmt.executeUpdate("DROP FUNCTION IF EXISTS " + transFuncName);
        bboxStmt.executeUpdate("DROP FUNCTION IF EXISTS " + bboxFuncName);

        sql =
                "CREATE or REPLACE FUNCTION "
                        + transFuncName
                        + "(obj json, cw int, ch int, params json) RETURNS json"
                        + "AS $$ "
                        + trans.getTransformFuncBody()
                        + " $$";
        bboxStmt.executeUpdate(sql);

        sql = "CREATE or REPLACE FUNCTION " + bboxFuncName + "(v json, )";
    }
}
