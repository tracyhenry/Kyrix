package index;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import main.Config;
import main.DbConnector;
import main.Main;
import project.Canvas;
import project.Layer;
import project.Table;
import project.Transform;

/** Created by xinli on 8/15/19. */
class PsqlPredicatedTableIndexer extends PsqlNativeBoxIndexer {

    private static PsqlPredicatedTableIndexer instance = null;

    // singleton pattern to ensure only one instance existed
    private PsqlPredicatedTableIndexer() {}

    // thread-safe instance getter
    public static synchronized PsqlPredicatedTableIndexer getInstance() {
        if (instance == null) instance = new PsqlPredicatedTableIndexer();
        return instance;
    }

    @Override
    public void createMV(Canvas c, int layerId) throws Exception {
        Layer l = c.getLayers().get(layerId);
        Transform trans = l.getTransform();
        HashMap<String, Integer> hashMap = new HashMap<>();

        // this is used to find the correct table
        String tid = c.getId();
        Table t = null;
        ArrayList<Table> tables = Main.getProject().getTables();
        for (int i = 0; i < tables.size(); i++) {
            t = tables.get(i);
            if (tid.equals(t.getName())) {
                System.out.println("table name:" + t.getName());
                break;
            }
        }

        String transQuery = trans.getQuery();
        // predicate columns are "group_by" in compiler
        ArrayList<String> predcols = t.getPredCols();
        // predSchema is "fields" union "group_by" in compiler
        ArrayList<String> predSchema = t.getSchema();

        // this is used for mapping pred col to index in result set
        ArrayList<Integer> indices = new ArrayList<>();
        // the index of ty is because "kyrix_ty" is not in the result set but in the pred Schema
        int indexOfTy = predSchema.indexOf("kyrix_ty");
        for (int i = 0; i < predcols.size(); i++) {
            int index = predSchema.indexOf(predcols.get(i));
            if (index > indexOfTy) indices.add(index - 1);
            else indices.add(index);
        }

        // step 0: create tables for storing bboxes and tiles
        String bboxTableName =
                "bbox_" + Main.getProject().getName() + "_" + c.getId() + "layer" + layerId;

        // drop table if exists
        Statement dropCreateStmt = DbConnector.getStmtByDbName(Config.databaseName);
        String sql = "drop table if exists " + bboxTableName + ";";
        System.out.println(sql);
        dropCreateStmt.executeUpdate(sql);

        System.out.println("predSchema: " + predSchema);
        System.out.println("indices: " + indices);
        sql = "CREATE UNLOGGED TABLE " + bboxTableName + " (";
        // predSchema: fields rn ty predicate
        for (int i = 0; i < predSchema.size(); i++) sql += predSchema.get(i) + " text, ";
        sql += "cx double precision, cy double precision, minx double precision, ";
        sql += "miny double precision, maxx double precision, maxy double precision, geom box)";
        dropCreateStmt.executeUpdate(sql);
        dropCreateStmt.close();

        // step 2: looping through query results
        String transDb = trans.getDb();
        System.out.println("db=" + transDb + " - query=" + transQuery);

        Statement rawDBStmt = DbConnector.getStmtByDbName(transDb, true);
        ResultSet rs = DbConnector.getQueryResultIterator(rawDBStmt, transQuery);
        int numColumn = rs.getMetaData().getColumnCount();
        int rowCount = 0;
        String insertSql = "INSERT INTO " + bboxTableName + " VALUES (";
        // for debugging, vary number of spaces after the commas
        for (int i = 0; i < predSchema.size(); i++) {
            insertSql += "?,";
        }
        insertSql += "?,?,?,?,?,?)";
        System.out.println(insertSql);
        PreparedStatement preparedStmt =
                DbConnector.getPreparedStatement(Config.databaseName, insertSql);
        long startTs = (new Date()).getTime();
        long lastTs = startTs;
        long currTs = 0;
        long secs = 0;
        int numcols = predSchema.size();
        int batchsize = Config.bboxBatchSize;
        System.out.println(
                "batchsize="
                        + String.valueOf(batchsize)
                        + "  numColumn="
                        + String.valueOf(numColumn));
        double heads_height = t.getHeadsHeight();
        double cell_height = t.getCellHeight();
        double y0 = t.getY();
        while (rs.next()) {
            rowCount++;

            StringBuilder hashkeysb = new StringBuilder();
            for (int i : indices) {
                hashkeysb.append(rs.getString(i + 1));
            }
            String hashkey = hashkeysb.toString();
            // get the row number of current row in current category
            int rn = hashMap.getOrDefault(hashkey, 0) + 1;
            // update rn(row number)
            hashMap.put(hashkey, rn);

            double ty = y0 + heads_height + (rn - 0.5) * cell_height;

            // raw: fields, rn, groupby
            // transformed: fields, rn, ty, groupby
            int pscol = 1;
            ArrayList<String> transformedRow = new ArrayList<>();
            for (int i = 0; i < numcols; i++) {
                if (i < indexOfTy - 1) {
                    transformedRow.add(rs.getString(i + 1));
                } else if (i == indexOfTy - 1) {
                    transformedRow.add(rn + "");
                } else if (i == indexOfTy) {
                    transformedRow.add(ty + "");
                } else {
                    transformedRow.add(rs.getString(i));
                }
                // more compact this way, no need for the second looping
                preparedStmt.setString(pscol++, transformedRow.get(i).replaceAll("\'", "\'\'"));
            }

            ArrayList<Double> curBbox = getBboxCoordinates(l, transformedRow);
            for (int i = 0; i < 6; i++) preparedStmt.setDouble(pscol++, curBbox.get(i));
            preparedStmt.addBatch();

            if (rowCount % batchsize == 0) {
                preparedStmt.executeBatch();
            }
            if (rowCount % 1000 == 0) {
                // perf: only measure to the nearest 1K recs/sec
                currTs = (new Date()).getTime();
                if (currTs / 10000 > lastTs / 10000) { // print every N=10 seconds
                    lastTs = currTs;
                    secs = (currTs - startTs) / 1000;
                    if (secs > 0) {
                        System.out.println(
                                secs
                                        + " secs: "
                                        + rowCount
                                        + " records inserted. "
                                        + (rowCount / secs)
                                        + " recs/sec.");
                    }
                }
            }
        }
        // insert tail stuff
        if (rowCount % batchsize != 0) {
            preparedStmt.executeBatch();
        }
        preparedStmt.close();

        // close reader connection
        rs.close();
        rawDBStmt.close();
        DbConnector.closeConnection(trans.getDb());

        startTs = (new Date()).getTime();

        // compute geom field in the database, where it can happen in parallel
        Statement setGeomFieldStmt = DbConnector.getStmtByDbName(Config.databaseName);
        sql = "UPDATE " + bboxTableName + " SET geom=box( point(minx,miny), point(maxx,maxy) );";
        System.out.println(sql);
        setGeomFieldStmt.executeUpdate(sql);
        setGeomFieldStmt.close();

        currTs = (new Date()).getTime();
        System.out.println(((currTs - startTs) / 1000) + " secs for setting geom field");
        startTs = currTs;

        // create index - gist/spgist require logged table type
        Statement createIndexStmt = DbConnector.getStmtByDbName(Config.databaseName);
        sql = "CREATE INDEX sp_" + bboxTableName + " ON " + bboxTableName + " USING gist (geom);";
        System.out.println(sql);
        createIndexStmt.executeUpdate(sql);
        createIndexStmt.close();

        currTs = (new Date()).getTime();
        System.out.println(
                ((currTs - startTs) / 1000)
                        + " secs for CREATE INDEX sp_"
                        + bboxTableName
                        + " ON "
                        + bboxTableName);
    }
}
