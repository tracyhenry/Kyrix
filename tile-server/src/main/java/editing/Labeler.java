/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package editing;

import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import main.Config;
import main.DbConnector;

/**
 *
 * @author Ariel Jacobs
 */
public class Labeler {
    public static final String DATABASE_NAME = "mghdata";
    
    /**
     * 
     * @param table with the labels to edit.
     * @param labeler modifying the labels.
     * @param label for the item.
     * @param item id to be labeled.
     * @return if the label was applied.
     * @throws ClassNotFoundException
     * @throws SQLException 
     */
    public Boolean label(String table, String labeler, String label, String item) throws ClassNotFoundException, SQLException {

        // get db connector for reuse among layers
        Statement stmt = DbConnector.getStmtByDbName(DATABASE_NAME);
        Timestamp timestamp = new Timestamp(System.currentTimeMillis());

        String sql = String.format("INSERT INTO %s VALUES (\'%s\', \'%s\', \'%s\', \'%s\');", table, item, labeler, label, timestamp);

        // run query, add to response
        int updates = stmt.executeUpdate(sql);
        DbConnector.commitConnection(DATABASE_NAME);

        stmt.close();
        return updates > 0;
    }
}